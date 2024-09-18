// �ʿ��� ����� �ҷ�����
const express = require('express'); // �� ������ ���� �����ϱ� ���� �����ӿ�ũ
const multer = require('multer'); // ���� ���ε带 ó���ϱ� ���� �̵����
const cors = require('cors'); // CORS(Cross-Origin Resource Sharing)�� ����ϱ� ���� �̵����
const path = require('path'); // ���� �� ���丮 ��� ������ ���� ��ƿ��Ƽ
const fs = require('fs').promises; // ���� �ý����� �񵿱������� �����ϱ� ���� fs ����� ����̽� ����
const fs_notP = require('fs'); // fs ����� �Ϲ� ����
const bodyParser = require('body-parser'); // ��û ������ �Ľ��ϱ� ���� �̵����
const mysql = require("mysql2");

// Express ���ø����̼� �ʱ�ȭ
const app = express();
const port = 3000; // ������ ����� ��Ʈ ��ȣ

//index.js
const axios = require("axios");
const dotenv = require("dotenv");
const readline = require("readline");

// Load environment variables from .env file
dotenv.config();

// ��û ������ JSON �������� �Ľ��ϵ��� ����
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ��� �����ο��� ������ ������ �� �ֵ��� CORS ����
app.use(cors());

//------------------------------------------------------------------------------------------

// OpenAI API key
const apiKey = "sk-AMCZ91GyJVrPVGxvlqGJ6CESeC0oqiyJdwNjFNxVDbT3BlbkFJp--d16j4xZaDbR2xpkxdcgGK6B7DAIoetgX9WA5vcA";

// Function to call the ChatGPT API
async function callChatGPT(prompt) {
    const url = "https://api.openai.com/v1/chat/completions";

    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
    };

    const data = {
        model: "gpt-4-turbo",
        messages: [
            {
                role: "system",
                content: `
                You are a smart assistant that helps to extract key nouns from sentences 
                and match them with appropriate database columns. The database columns are:
                - movieName: The title of the movie.
                - timeStamp: The timestamp of the scene.
                - subText: Subtitles or text appearing in the scene (in Korean).
                - voiceText: Voice or spoken words in the scene (in English).
                - placeText: The location or place in the scene.
                - isMainActor: Whether the actor is a main character (Y/N).
                - actorName: The name of the actor in the scene.
                - actorGender: The gender of the actor.

                When provided with a sentence, extract the key nouns and match them to the most appropriate database columns.

                IMPORTANT: 
                - If a keyword is written in Hangul (Korean characters), it should be searched in the 'subText' column.
                - If a keyword is written in Latin script (English characters), it should be searched in the 'voiceText' column.
                - Names of people (e.g., '����', '����Ʋ��') should always be matched to the 'actorName' column.
                - Ignore keywords like '���' (e.g., '~�ϴ� ���') when extracting key nouns. These do not need to be matched to any database columns.

                Return the result as a JSON object with the 'keywords' mapped to the appropriate database columns.
                `,
            },
            { role: "user", content: prompt },
        ],
    };    

    try {
        const response = await axios.post(url, data, { headers });
        const result = response.data.choices[0].message.content.trim();

        // Try parsing the result as JSON
        let parsedResult;
        try {
            parsedResult = JSON.parse(result);
        } catch (parseError) {
            console.warn("Response is not valid JSON:", result);
            parsedResult = result;  // Return the raw result if it's not JSON
        }

        return parsedResult;
    } catch (error) {
        console.error("Error calling ChatGPT API:", error.response ? error.response.data : error.message);
        throw error;
    }
}

//------------------------------------------------------------------------------------------


// Serve static files from 'C:/Users/UBIT/movie'
app.use('/movies', express.static('C:/Users/UBIT/movie'));

// MySQL �����ͺ��̽� ���� Ǯ ����
const pool = mysql.createPool({
    host: "202.31.147.129", // MySQL ������ ȣ��Ʈ
    user: "jisung", // MySQL ������� �̸�
    database: "movie_hackerton", // ����� �����ͺ��̽� �̸�
    password: "Wldnjs981212@@", // MySQL ������� ��й�ȣ
    port: 13306,
    waitForConnections: true, // ������ ��� ��� ���� �� ������� ����
    connectionLimit: 10, // ���� Ǯ�� �ִ� ���� ��
    queueLimit: 0, // ��⿭�� �ִ� ���� ��û �� (0�� ������)
    charset  : 'utf8mb4'
});  

// Route to get movie information via POST request
app.post('/get-movie-info', async (req, res) => {
    let { movieName } = req.body;
    console.log(movieName);
    if (movieName.startsWith('(') && movieName.includes(')')) {
        movieName = movieName.replace(/\(.*?\)\s*/, '');
    }
    try {
        const promisePool = pool.promise();
        const [rows] = await promisePool.query("SELECT movieName, moviePoster, movieGenrens, movieTime, relDate, relCountry, movieAactor1, actorPoster1, movieAactor2, actorPoster2, movieAactor3, actorPoster3, movieAactor4, actorPoster4 FROM movie_info_v1 WHERE movieName = ?", [movieName]);
        console.log(rows);
        if (rows.length > 0) {
            res.json(rows[0]); // Send the movie information as a JSON response
        } else {
            res.status(404).json({ error: "Movie not found" });
        }
    } catch (error) {
        console.error("Error fetching movie information:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
});


app.post('/get-movie-details', async (req, res) => {
    const { movieName } = req.body;

    let cleanedMovieName = movieName;

    // Remove text within parentheses and the parentheses themselves
    if (cleanedMovieName.startsWith('(') && cleanedMovieName.includes(')')) {
        cleanedMovieName = cleanedMovieName.replace(/\(.*?\)\s*/, '');
    }
    console.log(cleanedMovieName);
    try {
        const promisePool = pool.promise();

        // Fetch the movie information
        const [movieRows] = await promisePool.query(`
            SELECT movieName, moviePoster, movieGenrens, movieTime, relDate, relCountry, 
                   movieAactor1, actorPoster1, movieAactor2, actorPoster2, 
                   movieAactor3, actorPoster3, movieAactor4, actorPoster4 
            FROM movie_info_v1 
            WHERE movieName = ?
        `, [cleanedMovieName]);

        if (movieRows.length === 0) {
            return res.status(404).json({ error: "Movie not found" });
        }

        const movieInfo = movieRows[0];

        // Fetch the movie summary
        const [summaryRows] = await promisePool.query(`
            SELECT summary 
            FROM movie_summary 
            WHERE movieName = ? AND language = 'kor'
        `, [cleanedMovieName]);
        console.log(movieInfo);
        console.log(summaryRows);
        if (summaryRows.length > 0) {
            movieInfo.summary = summaryRows[0].summary;
        } else {
            movieInfo.summary = "Summary not available.";
        }

        res.json(movieInfo);
    } catch (error) {
        console.error("Error fetching movie details:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
});


// ��ȭ ���
app.get('/movie-summary', async (req, res) => {
    const { title, language } = req.query;
    let movieTitle = title;

    // Remove text within parentheses and the parentheses themselves
    if (movieTitle.startsWith('(') && movieTitle.includes(')')) {
        movieTitle = movieTitle.replace(/\(.*?\)\s*/, '');
    }

    try {
        const promisePool = pool.promise();
        const [rows] = await promisePool.query("SELECT summary FROM movie_summary WHERE movieName = ? AND language = ?", [movieTitle, language]);

        if (rows.length > 0) {
            res.json({ summary: rows[0].summary });
        } else {
            res.status(404).json({ error: "Movie summary not found" });
        }
    } catch (error) {
        console.error("Error fetching movie summary:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ��ȭ ���� ���� �ٿ��ִ� �Լ�
async function getFormattedMovieTitle(movieName) {
    const promisePool = pool.promise();
    const [rows] = await promisePool.query("SELECT movieYear FROM movie_year WHERE movieName = ?", [movieName]);
    
    if (rows.length > 0) {
        const movieYear = rows[0].movieYear;
        return `(${movieYear}) ${movieName}`;
    }
    
    // If no year is found, return the movieName as is
    return movieName;
}


// '/search' ��ο� ���� GET ��û�� ó��
app.get("/search", async (req, res) => {
    let searchWords = Array.isArray(req.query.searchWords) ? req.query.searchWords : [req.query.searchWords].filter(Boolean);
    const searchScope = Array.isArray(req.query.searchScope) ? req.query.searchScope : [req.query.searchScope].filter(Boolean);
    let selectedMovie = req.query.selectedMovie || '';
    const searchActor = Array.isArray(req.query.searchActor) ? req.query.searchActor : [req.query.searchActor].filter(Boolean);
    const searchPlace = Array.isArray(req.query.searchPlace) ? req.query.searchPlace : [req.query.searchPlace].filter(Boolean);

    if (selectedMovie.startsWith('(') && selectedMovie.includes(')')) {
        selectedMovie = selectedMovie.replace(/\(.*?\)\s*/, '');
    }
    console.error('Request Params:', searchWords, searchScope, selectedMovie, searchActor, searchPlace);

    try {
        const promisePool = pool.promise();
        let query = "SELECT movieName, timeStamp";
        const queryParams = [];

        // Dynamically build the SELECT clause based on the selected search scope and placeText
        if (searchScope.includes('subText')) query += ", subText";
        if (searchScope.includes('voiceText')) query += ", voiceText";
        if (searchScope.includes('placeText')) query += ", placeText";
        
        if (searchActor.length > 0 && !searchActor.includes('searchAllActor')) {
            if (searchActor.some(actor => actor === 'man' || actor === 'women')) query += ", actorGender";
            if (searchActor.some(actor => actor === 'Y' || actor === 'N')) query += ", isMainActor";
            if (searchActor.some(actor => actor !== 'NoName')) query += ", actorName";
        }

        query += " FROM datatable_v4 WHERE ";

        // Handle searchWords
        if (searchWords.length > 0 && !searchWords.includes('searchAllWords')) {
            const textConditions = searchScope.map(scope => `${scope} IS NOT NULL AND ${scope} LIKE ?`).join(' OR ');
            query += `(${textConditions}) AND `;
            searchWords.forEach(word => {
                const searchWildcard = `%${word}%`;
                searchScope.forEach(() => queryParams.push(searchWildcard));
            });
        }

        // Handle selectedMovie
        if (selectedMovie && selectedMovie !== 'searchAllMovie') {
            query += "movieName = ? AND ";
            queryParams.push(selectedMovie);
        }

        // Handle searchActor
        if (searchActor.length > 0 && !searchActor.includes('searchAllActor')) {
            const actorConditions = [];

            searchActor.forEach(actor => {
                if (actor === 'man' || actor === 'women') {
                    actorConditions.push('actorGender LIKE ?');
                    queryParams.push(`%${actor}%`);
                } else if (actor === 'Y' || actor === 'N') {
                    actorConditions.push('isMainActor = ?');
                    queryParams.push(actor);
                } else if (actor !== 'NoName') {
                    actorConditions.push('actorName LIKE ?');
                    queryParams.push(`%${actor}%`);
                }
            });

            if (actorConditions.length > 0) {
                query += `(${actorConditions.join(' AND ')}) AND `;
            }
        }

        // Handle searchPlace
        if (searchPlace.length > 0 && !searchPlace.includes('searchAllPlace')) {
            const placeConditions = searchPlace.map(place => `placeText IS NOT NULL AND placeText LIKE ?`).join(' AND ');
            query += `${placeConditions} AND `;
            searchPlace.forEach(place => {
                const searchWildcard = `%${place}%`;
                queryParams.push(searchWildcard);
            });
        }

        query = query.slice(0, -4); // Remove the last "AND"

        console.log('Executing query:', query);
        console.log('Query params:', queryParams);

        const [rows] = await promisePool.query(query, queryParams);

        // Debug: Print the rows to see if placeText is coming through
        //console.log('Rows:', rows);

        const filteredRows = await Promise.all(rows.map(async row => {
            const formattedMovieName = await getFormattedMovieTitle(row.movieName);
            const filteredRow = {};
            if (formattedMovieName) filteredRow.movieName = formattedMovieName;
            if (row.timeStamp) filteredRow.timeStamp = row.timeStamp;
            if (searchScope.includes('subText') && row.subText) filteredRow.subText = row.subText;
            if (searchScope.includes('voiceText') && row.voiceText) filteredRow.voiceText = row.voiceText;
            if (searchPlace.length > 0 && row.placeText) filteredRow.placeText = row.placeText; // Ensure placeText is included in the JSON response when searchPlace is selected
            if (searchActor.some(actor => actor === 'man' || actor === 'women') && row.actorGender) filteredRow.actorGender = row.actorGender;
            if (searchActor.some(actor => actor === 'Y' || actor === 'N') && row.isMainActor) filteredRow.isMainActor = row.isMainActor;
            if (searchActor.some(actor => actor !== 'NoName') && row.actorName) filteredRow.actorName = row.actorName;
            return filteredRow;
        }));

        res.send(filteredRows);
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).send({ error: "Server error occurred." });
    }
});

// ������� �˻��� �� ���� �ֱٿ� ���ε�Ȱ� �������� �ڵ�
app.get('/get-latest-entry', async (req, res) => {
    try {
        await new Promise(resolve => setTimeout(resolve, 8000));
        const promisePool = pool.promise();
        const [rows] = await promisePool.query(`
            SELECT * FROM addtable ORDER BY label DESC LIMIT 1;
        `);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: "No entries found in addtable." });
        }
        
        const latestEntry = rows[0];
        res.json(latestEntry);
    } catch (error) {
        console.error("Error fetching the latest entry:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// �ֱٿ� ���� db ����� ��ġ�ϴ� ��� ã�Ƽ� ������
app.get('/search-matching-scenes', async (req, res) => {
    try {
        const { subText, voiceText, placeText } = req.query;
        //console.log("1 : "+subText+" "+voiceText+" "+placeText);
        const conditions = [];
        const params = [];

        if (subText) {
            conditions.push("subText LIKE ?");
            params.push(`%${subText}%`);
        }

        if (voiceText) {
            conditions.push("voiceText LIKE ?");
            params.push(`%${voiceText}%`);
        }

        if (placeText) {
            conditions.push("placeText LIKE ?");
            params.push(`%${placeText}%`);
        }

        if (conditions.length === 0) {
            return res.status(400).json({ error: "No search criteria provided." });
        }

        const query = `
            SELECT movieName, timeStamp
            FROM datatable_v4
            WHERE ${conditions.join(" AND ")}
        `;
        //console.log("\n 2. conditions : "+conditions);
        //console.log("\n 3. query : "+query)
        //console.log("\n 4. params : "+params)
        const promisePool = pool.promise();
        const [rows] = await promisePool.query(query, params);
        //console.log("\n 5. rows : "+rows)
        
        if (rows.length === 0) {
            return res.status(404).json({ error: "No matching scenes found." });
        }

        const formattedRows = await Promise.all(rows.map(async row => {
            const formattedMovieName = await getFormattedMovieTitle(row.movieName);
            return {
                ...row,
                movieName: formattedMovieName
            };
        }));
        //console.log("\n 6. formattedRows : "+formattedRows)
        res.json(formattedRows);
    } catch (error) {
        console.error("Error searching for matching scenes:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ------------------ �������� �˻� ------------------
// Function to search the database based on the criteria provided by ChatGPT
async function searchDatabase(searchCriteria, pool) {
    const promisePool = pool.promise();
    let query = "SELECT movieName, timeStamp, subText, voiceText, placeText, actorName, actorGender, isMainActor";
    const queryParams = [];

    console.log("\n 1. searchCriteria : " + JSON.stringify(searchCriteria, null, 2));
    query += " FROM datatable_v4 WHERE ";

    const conditions = [];

     // Loop through each keyword and its associated columns
    for (const [keyword, columns] of Object.entries(searchCriteria.keywords)) {
        if (Array.isArray(columns)) {
            // If multiple columns are associated with the keyword
            const columnConditions = columns.map(column => `${column} LIKE ?`).join(' OR ');
            conditions.push(`(${columnConditions})`);
            columns.forEach(() => queryParams.push(`%${keyword}%`));
        } else {
            // If only one column is associated with the keyword
            conditions.push(`${columns} LIKE ?`);
            queryParams.push(`%${keyword}%`);
        }
    }

    if (conditions.length === 0) {
        return [];
    }

    query += conditions.join(" AND ");

    console.log("\n 2. conditions : "+conditions)
    console.log("\n 3. query : "+query)
    console.log("\n 4. queryParams : "+queryParams)

    const [rows] = await promisePool.query(query, queryParams);

    console.log("\n rows : " + JSON.stringify(rows, null, 2));
    return rows;
}

// POST route to process the scene search
app.post('/processSceneSearch', async (req, res) => {
    const { inputSentence } = req.body;

    try {
        // Call ChatGPT to extract keywords and determine search columns
        const searchCriteria = await callChatGPT(inputSentence);

        console.log("Search Criteria:", searchCriteria);

        // Perform the database search based on extracted criteria
        const searchResults = await searchDatabase(searchCriteria, pool);

        if (searchResults.length === 0) {
            return res.status(404).json({ message: "No matching scenes found." });
        }
        console.log("\nsearchResults:", searchResults);
        // Format movie names with year (if applicable) before sending the response
        const formattedResults = await Promise.all(searchResults.map(async row => {
            const formattedMovieName = await getFormattedMovieTitle(row.movieName);
            return {
                ...row,
                movieName: formattedMovieName
            };
        }));
        console.log("\nformattedResults:", formattedResults);
        res.json({ results: formattedResults, searchCriteria });
    } catch (error) {
        console.error("Error processing scene search:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
});


// '/createFile' ��ο� ���� POST ��û�� ó���Ͽ� ���� ����
app.post('/createFile', (req, res) => {
    const { fileName } = req.body;
    const filePath = path.join('C:/Users/UBIT/translate', fileName);

    // ������ �����ϴ��� Ȯ��
    fs_notP.access(filePath, fs_notP.constants.F_OK, (err) => {
        if (err) {
            // ������ �������� ������ ���� ����
            fs_notP.writeFile(filePath, 'Sample content', (writeErr) => {
                if (writeErr) {
                    console.error('Error creating file:', writeErr);
                    return res.status(500).send('Failed to create file.');
                }
                res.send('File created successfully.');
                console.log('File created successfully:', filePath);
            });
        } else {
            // ������ �̹� �����ϸ� ���� �޽��� ��ȯ
            res.send('File already exists. Success.');
            console.log('File already exists:', filePath);
        }
    });
});

// '/downloadFile' ��ο� ���� GET ��û�� ó���Ͽ� ���� �ٿ�ε�
app.get('/downloadFile', (req, res) => {
    const { fileName } = req.query;
    const filePath = path.join('C:/Users/UBIT/translate', fileName);

    // ������ �о ������ ���� Ȯ��
    fs_notP.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).send('Failed to read file.');
        }
        const lines = data.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        console.log('4', fileName, lastLine)
        
        // ������ ���� '< end >'�� ��� ���� �ٿ�ε� ����
        if (lastLine === '< end >') {
            res.download(filePath, fileName, (downloadErr) => {
                if (downloadErr) {
                    console.error('Error downloading file:', downloadErr);
                    return res.status(500).send('Failed to download file.');
                }
            });
        } else {
            // ������ �غ���� �ʾ����� 400 ���� �ڵ� ��ȯ
            res.status(400).send('File is not ready for download.');
        }
    });
});

// ������ �����ϴ��� Ȯ���ϴ� �񵿱� �Լ�
async function fileExists(filePath) {
    try {
        await fs.access(filePath); // ���� ��ο� ������ �� �ִ��� Ȯ��
        return true; // ���� �����ϸ� true ��ȯ
    } catch (err) {
        return false; // ���� �Ұ����ϸ� false ��ȯ
    }
}

// ���� �̸��� �����ϴ� �Լ� (�ߺ� ó�� ����)
async function generateFileName(baseName, ext, dir) {
    let filePath = path.join(dir, `${baseName}${ext}`);
    let counter = 1;

    while (await fileExists(filePath)) { // ���� �̸��� �ߺ��̸� (1), (2).. �߰��ϱ� 
        const newBaseName = `${baseName}(${counter})`;
        filePath = path.join(dir, `${newBaseName}${ext}`);
        counter++;
    }
    return path.basename(filePath);
}

// Multer �̵���� ����
const upload = multer({ dest: 'C:/Users/UBIT/movie/' });

// '/upload' ��η� ������ ���� ���ε� ��û�� ó���ϴ� ���Ʈ
app.post('/upload', upload.single('videoFile'), async (req, res) => {
    try {
        if (req.file) { // ���ε�� ������ �ִ��� Ȯ��
            const originalName = req.file.originalname; // ���ε�� ������ ���� �̸�
            const ext = path.extname(originalName); // ������ Ȯ���� ����

            const year = req.body.year; // Extracted year
            const title = req.body.title; // Extracted title
            console.log('1 ' +year + ' ' + title)
            // Insert movieName and movieYear into the movie_year table
            const promisePool = pool.promise();
            await promisePool.query("INSERT INTO movie_year (movieName, movieYear) VALUES (?, ?)", [title, year]);

            // Construct the file path with the extracted title and year
            const baseName = `(${year}) ${title}`;
            let filePath = path.join('C:/Users/UBIT/movie/', `${baseName}${ext}`);

            // ���� �̸��� �ߺ��Ǵ��� Ȯ��
            if (await fileExists(filePath)) {
                await fs.unlink(req.file.path); // �ߺ��Ǹ� ���ε� ����
                res.status(409).send('File with the same name already exists');
                return;
            }
            await fs.rename(req.file.path, filePath); // ���ε�� ������ ���ο� ��η� �̵�
            console.log('Upload successful:', filePath); // �ֿܼ� ���ε� ���� �޽��� ���
            res.send('Upload successful'); // Ŭ���̾�Ʈ�� ���ε� ���� �޽��� ����
        } else {
            console.log('No file provided'); // ���ε�� ������ ���� ���
            res.status(400).send('No file provided'); // Ŭ���̾�Ʈ�� ���� �޽��� ����
        }
    } catch (err) {
        console.error(err); // ������ �߻��� ��� �ֿܼ� ���
        res.status(500).send('Internal server error'); // Ŭ���̾�Ʈ�� ���� ���� ���� �޽��� ����
    }
});


// �Լ��� ����Ͽ� ���� Ÿ�Կ� ���� base ��θ� ��ȯ�ϴ� �Լ�
function getBasePath(fileType) {
    switch (fileType) {
        case 'image':
            return 'C:/Users/UBIT/frame/';
        case 'text':
            return 'C:/Users/UBIT/texts/';
        case 'voice':
            return 'C:/Users/UBIT/mp3/';
        default:
            throw new Error('Invalid fileType');
    }
}

// �߰� ���� ���ε带 ���� Multer �̵���� ����
const additionalUpload = multer({
    storage: multer.diskStorage({
        destination: async (req, file, cb) => {
            const { fileType } = req.body; // ��û �������� ���� Ÿ�� ����

            if (!fileType) { // ���� Ÿ���� ���� ���
                console.error('fileType is required'); // �ֿܼ� ���� �޽��� ���
                return cb(new Error('fileType is required'), null); // ���� �ݹ� ȣ��
            }
            try {
                const basePath = getBasePath(fileType);
                const dest = path.join(basePath, 'add_upload'); // ���� ��� ����
                await fs.mkdir(dest, { recursive: true }); // ���丮�� ���� ��� ����
                cb(null, dest); // �ݹ����� ���� ��� ����
            } catch (err) {
                console.error(err); // ������ �߻��� ��� �ֿܼ� ���
                return cb(err, null); // ���� �ݹ� ȣ��
            }
        },
        filename: async (req, file, cb) => {
            const ext = path.extname(file.originalname); // ������ Ȯ���� ����
            const baseName = `(${req.body.yea}) ${req.body.title}`; // ������ ������ ������ �⺻ ���� �̸�

            try {
                const basePath = getBasePath(req.body.fileType);
                const dir = path.join(basePath, 'add_upload'); // ���� ��� ����
                const filename = await generateFileName(baseName, ext, dir);
                cb(null, filename); // �ݹ����� ���� ���� �̸� ����
            } catch (err) {
                console.error(err); // ������ �߻��� ��� �ֿܼ� ���
                return cb(err, null); // ���� �ݹ� ȣ��
            }
        }
    })
});

// '/uploadAdditional' ��η� ������ �߰� ���� ���ε� ��û�� ó���ϴ� ���Ʈ
app.post('/uploadAdditional', additionalUpload.single('additionalFile'), async (req, res) => {
    try {
        if (req.file) { // ���ε�� ������ �ִ��� Ȯ��
            const originalName = req.file.originalname; // ���ε�� ������ ���� �̸�
            const ext = path.extname(originalName); // ������ Ȯ���� ����
            const basePath = getBasePath(req.body.fileType);
            const baseName = `(${req.body.year}) ${req.body.title}`; // ������ ������ ������ �⺻ ���� �̸�

            // �Է��� ������ �������� ����� ���� ��� ����
            let filePath = path.join(basePath, 'add_upload', `${baseName}${ext}`);

            // ���� �̸��� �ߺ��Ǵ��� Ȯ��
            if (await fileExists(filePath)) {
                const newFileName = await generateFileName(baseName, ext, path.join(basePath, 'add_upload'));
                filePath = path.join(basePath, 'add_upload', newFileName);
            }

            await fs.rename(req.file.path, filePath); // ���ε�� ������ ���ο� ��η� �̵�

            console.log('Additional file upload successful:', filePath); // �ֿܼ� ���ε� ���� �޽��� ���
            res.send('Additional file upload successful'); // Ŭ���̾�Ʈ�� ���ε� ���� �޽��� ����
        } else {
            console.log('No additional file provided'); // ���ε�� ������ ���� ���
            res.status(400).send('No additional file provided'); // Ŭ���̾�Ʈ�� ���� �޽��� ����
        }
    } catch (err) {
        console.error(err); // ������ �߻��� ��� �ֿܼ� ���
        res.status(500).send('Internal server error'); // Ŭ���̾�Ʈ�� ���� ���� ���� �޽��� ����
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
