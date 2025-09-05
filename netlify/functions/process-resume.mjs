import { GoogleGenerativeAI } from "@google/generative-ai";
import { google } from 'googleapis';
import Busboy from 'busboy';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

// Initialize Gemini with the API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

// Initialize Google Sheets API with credentials from environment variables
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

/**
 * Parses the incoming file stream based on its content type.
 * Returns the extracted text content.
 */
async function parseFile(fileBuffer, mimetype) {
    let resumeText = '';
    
    if (mimetype === 'application/pdf') {
        const data = await pdf(fileBuffer);
        resumeText = data.text;
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
        resumeText = value;
    } else {
        throw new Error('Unsupported file type. Please upload a PDF or DOCX file.');
    }

    if (!resumeText) {
        throw new Error('Resume content could not be extracted. The file may be empty or corrupted.');
    }
    
    return resumeText;
}

/**
 * Handler for the Netlify Function.
 * It's structured to receive a file upload, process it,
 * and interact with the Gemini and Google Sheets APIs.
 */
export async function handler(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Only POST requests are allowed.' }) };
    }

    // Busboy is used to parse the multipart/form-data request body from the file upload
    const busboy = Busboy({
        headers: {
            'content-type': event.headers['content-type']
        }
    });

    let fileBuffer;
    let fileMimeType;
    let finishedParsing = false;

    // A promise to handle the Busboy stream parsing asynchronously
    const parsePromise = new Promise((resolve, reject) => {
        busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
            if (fieldname !== 'resume') {
                return reject(new Error('Invalid form field name.'));
            }

            const chunks = [];
            file.on('data', chunk => chunks.push(chunk));
            file.on('end', () => {
                fileBuffer = Buffer.concat(chunks);
                fileMimeType = mimetype;
                resolve();
            });
            file.on('error', err => reject(err));
        });

        busboy.on('finish', () => {
            finishedParsing = true;
        });

        // Pipe the request body into Busboy
        busboy.end(Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8'));
    });

    try {
        await parsePromise;
        if (!finishedParsing) {
            throw new Error('File parsing did not finish correctly.');
        }

        const resumeText = await parseFile(fileBuffer, fileMimeType);

        // --- 1. CALL GOOGLE GEMINI API ---
        const prompt = `You are an expert ATS (Applicant Tracking System). Analyze the resume below and extract the candidate's personal data. Then, score the resume from 0-100 on ATS-friendliness for three categories and provide a brief comment for each.
        
Scoring Criteria:
Formatting & Layout: Score on simplicity, common fonts, consistent date formats, and no images.
Content Strategy: Score on strong action verbs, quantifiable metrics, and evidence of impact.
Contact Information: Score on correct order (Name, followed by a professional headline, then contact details).
        
Resume Content:
${resumeText}
        
Instructions:
Respond with ONLY a JSON object.
The JSON must have the following keys:
"personalData": {"name": "string", "email": "string", "phone": "string", "latestJobRole": "string"}
"scores": {"formatting": 0, "content": 0, "contact": 0}
"comments": {"formatting": "string", "content": "string", "contact": "string"}
Do not include any other text or explanation outside of the JSON object.`;
        
        // Use gemini-1.5-pro-latest to get better and more accurate results.
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        let geminiOutput;
        try {
            geminiOutput = JSON.parse(text);
        } catch (jsonError) {
            console.error("Error parsing Gemini JSON output:", jsonError);
            console.error("Gemini raw text:", text);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Failed to parse Gemini API response.', rawOutput: text })
            };
        }

        const { personalData, scores, comments } = geminiOutput;

        // --- 2. APPEND DATA TO GOOGLE SHEET ---
        const values = [
            [
                personalData.name,
                personalData.email,
                personalData.phone,
                personalData.latestJobRole,
                scores.formatting,
                comments.formatting,
                scores.content,
                comments.content,
                scores.contact,
                comments.contact,
                new Date().toISOString()
            ]
        ];

        try {
            await sheets.spreadsheets.values.append({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: 'Sheet1!A1',
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: values,
                },
            });
        } catch (sheetsError) {
            console.error("Error writing to Google Sheets:", sheetsError);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'An error occurred while writing to Google Sheets.' })
            };
        }

        // --- 3. RETURN ANALYSIS TO FRONTEND ---
        return {
            statusCode: 200,
            body: JSON.stringify(geminiOutput),
        };

    } catch (error) {
        console.error('An error occurred during processing:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message || 'An unexpected error occurred.' })
        };
    }
}
