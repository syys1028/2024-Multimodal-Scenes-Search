// 필요한 모듈을 불러오기
const express = require('express'); // 웹 서버를 쉽게 구축하기 위한 프레임워크
const multer = require('multer'); // 파일 업로드를 처리하기 위한 미들웨어
const cors = require('cors'); // CORS(Cross-Origin Resource Sharing)를 허용하기 위한 미들웨어
const path = require('path'); // 파일 및 디렉토리 경로 조작을 위한 유틸리티
const fs = require('fs').promises; // 파일 시스템을 비동기적으로 조작하기 위한 fs 모듈의 프라미스 버전
const fs_notP = require('fs'); // fs 모듈의 일반 버전
const bodyParser = require('body-parser'); // 요청 본문을 파싱하기 위한 미들웨어
const mysql = require("mysql2");

// Express 애플리케이션 초기화
const app = express();
const port = 3000; // 서버가 실행될 포트 번호

//index.js
const axios = require("axios");
const dotenv = require("dotenv");
const readline = require("readline");

// Load environment variables from .env file
dotenv.config();

// 요청 본문을 JSON 형식으로 파싱하도록 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 모든 도메인에서 서버에 접근할 수 있도록 CORS 설정
app.use(cors());

//------------------------------------------------------------------------------------------

// OpenAI API key
const apiKey = "my_api_key";
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
                - Names of people (e.g., '제리', '케이틀린') should always be matched to the 'actorName' column.
                - Ignore keywords like '장면' (e.g., '~하는 장면') when extracting key nouns. These do not need to be matched to any database columns.

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

// MySQL 데이터베이스 연결 풀 생성
const pool = mysql.createPool({
    host: "my_ip", // MySQL 서버의 호스트
    user: "root", // MySQL 사용자의 이름
    database: "movie_hackerton", // 사용할 데이터베이스 이름
    password: "my_pw", // MySQL 사용자의 비밀번호
    port: 13306,
    waitForConnections: true, // 연결이 모두 사용 중일 때 대기할지 여부
    connectionLimit: 10, // 연결 풀의 최대 연결 수
    queueLimit: 0, // 대기열의 최대 연결 요청 수 (0은 무제한)
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


// 영화 요약
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

// 영화 제목에 연도 붙여주는 함수
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


// '/search' 경로에 대한 GET 요청을 처리
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

// 장면으로 검색할 때 제일 최근에 업로드된거 가져오는 코드
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

// 최근에 들어온 db 내용과 일치하는 장면 찾아서 보여줌
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

// ------------------ 문장으로 검색 ------------------
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


// '/createFile' 경로에 대한 POST 요청을 처리하여 파일 생성
app.post('/createFile', (req, res) => {
    const { fileName } = req.body;
    const filePath = path.join('C:/Users/UBIT/translate', fileName);

    // 파일이 존재하는지 확인
    fs_notP.access(filePath, fs_notP.constants.F_OK, (err) => {
        if (err) {
            // 파일이 존재하지 않으면 파일 생성
            fs_notP.writeFile(filePath, 'Sample content', (writeErr) => {
                if (writeErr) {
                    console.error('Error creating file:', writeErr);
                    return res.status(500).send('Failed to create file.');
                }
                res.send('File created successfully.');
                console.log('File created successfully:', filePath);
            });
        } else {
            // 파일이 이미 존재하면 성공 메시지 반환
            res.send('File already exists. Success.');
            console.log('File already exists:', filePath);
        }
    });
});

// '/downloadFile' 경로에 대한 GET 요청을 처리하여 파일 다운로드
app.get('/downloadFile', (req, res) => {
    const { fileName } = req.query;
    const filePath = path.join('C:/Users/UBIT/translate', fileName);

    // 파일을 읽어서 마지막 줄을 확인
    fs_notP.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).send('Failed to read file.');
        }
        const lines = data.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        console.log('4', fileName, lastLine)
        
        // 마지막 줄이 '< end >'일 경우 파일 다운로드 제공
        if (lastLine === '< end >') {
            res.download(filePath, fileName, (downloadErr) => {
                if (downloadErr) {
                    console.error('Error downloading file:', downloadErr);
                    return res.status(500).send('Failed to download file.');
                }
            });
        } else {
            // 파일이 준비되지 않았으면 400 상태 코드 반환
            res.status(400).send('File is not ready for download.');
        }
    });
});

// 파일이 존재하는지 확인하는 비동기 함수
async function fileExists(filePath) {
    try {
        await fs.access(filePath); // 파일 경로에 접근할 수 있는지 확인
        return true; // 접근 가능하면 true 반환
    } catch (err) {
        return false; // 접근 불가능하면 false 반환
    }
}

// 파일 이름을 생성하는 함수 (중복 처리 포함)
async function generateFileName(baseName, ext, dir) {
    let filePath = path.join(dir, `${baseName}${ext}`);
    let counter = 1;

    while (await fileExists(filePath)) { // 파일 이름이 중복이면 (1), (2).. 추가하기 
        const newBaseName = `${baseName}(${counter})`;
        filePath = path.join(dir, `${newBaseName}${ext}`);
        counter++;
    }
    return path.basename(filePath);
}

// Multer 미들웨어 설정
const upload = multer({ dest: 'C:/Users/UBIT/movie/' });

// '/upload' 경로로 들어오는 파일 업로드 요청을 처리하는 라우트
app.post('/upload', upload.single('videoFile'), async (req, res) => {
    try {
        if (req.file) { // 업로드된 파일이 있는지 확인
            const originalName = req.file.originalname; // 업로드된 파일의 원래 이름
            const ext = path.extname(originalName); // 파일의 확장자 추출

            const year = req.body.year; // Extracted year
            const title = req.body.title; // Extracted title
            console.log('1 ' +year + ' ' + title)
            // Insert movieName and movieYear into the movie_year table
            const promisePool = pool.promise();
            await promisePool.query("INSERT INTO movie_year (movieName, movieYear) VALUES (?, ?)", [title, year]);

            // Construct the file path with the extracted title and year
            const baseName = `(${year}) ${title}`;
            let filePath = path.join('C:/Users/UBIT/movie/', `${baseName}${ext}`);

            // 파일 이름이 중복되는지 확인
            if (await fileExists(filePath)) {
                await fs.unlink(req.file.path); // 중복되면 업로드 안함
                res.status(409).send('File with the same name already exists');
                return;
            }
            await fs.rename(req.file.path, filePath); // 업로드된 파일을 새로운 경로로 이동
            console.log('Upload successful:', filePath); // 콘솔에 업로드 성공 메시지 출력
            res.send('Upload successful'); // 클라이언트에 업로드 성공 메시지 응답
        } else {
            console.log('No file provided'); // 업로드된 파일이 없을 경우
            res.status(400).send('No file provided'); // 클라이언트에 오류 메시지 응답
        }
    } catch (err) {
        console.error(err); // 오류가 발생한 경우 콘솔에 출력
        res.status(500).send('Internal server error'); // 클라이언트에 내부 서버 오류 메시지 응답
    }
});


// 함수를 사용하여 파일 타입에 따라 base 경로를 반환하는 함수
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

// 추가 파일 업로드를 위한 Multer 미들웨어 설정
const additionalUpload = multer({
    storage: multer.diskStorage({
        destination: async (req, file, cb) => {
            const { fileType } = req.body; // 요청 본문에서 파일 타입 추출

            if (!fileType) { // 파일 타입이 없을 경우
                console.error('fileType is required'); // 콘솔에 오류 메시지 출력
                return cb(new Error('fileType is required'), null); // 오류 콜백 호출
            }
            try {
                const basePath = getBasePath(fileType);
                const dest = path.join(basePath, 'add_upload'); // 최종 경로 설정
                await fs.mkdir(dest, { recursive: true }); // 디렉토리가 없을 경우 생성
                cb(null, dest); // 콜백으로 최종 경로 전달
            } catch (err) {
                console.error(err); // 오류가 발생한 경우 콘솔에 출력
                return cb(err, null); // 오류 콜백 호출
            }
        },
        filename: async (req, file, cb) => {
            const ext = path.extname(file.originalname); // 파일의 확장자 추출
            const baseName = `(${req.body.yea}) ${req.body.title}`; // 연도와 제목을 포함한 기본 파일 이름

            try {
                const basePath = getBasePath(req.body.fileType);
                const dir = path.join(basePath, 'add_upload'); // 최종 경로 설정
                const filename = await generateFileName(baseName, ext, dir);
                cb(null, filename); // 콜백으로 최종 파일 이름 전달
            } catch (err) {
                console.error(err); // 오류가 발생한 경우 콘솔에 출력
                return cb(err, null); // 오류 콜백 호출
            }
        }
    })
});

// '/uploadAdditional' 경로로 들어오는 추가 파일 업로드 요청을 처리하는 라우트
app.post('/uploadAdditional', additionalUpload.single('additionalFile'), async (req, res) => {
    try {
        if (req.file) { // 업로드된 파일이 있는지 확인
            const originalName = req.file.originalname; // 업로드된 파일의 원래 이름
            const ext = path.extname(originalName); // 파일의 확장자 추출
            const basePath = getBasePath(req.body.fileType);
            const baseName = `(${req.body.year}) ${req.body.title}`; // 연도와 제목을 포함한 기본 파일 이름

            // 입력한 연도와 제목으로 저장될 파일 경로 생성
            let filePath = path.join(basePath, 'add_upload', `${baseName}${ext}`);

            // 파일 이름이 중복되는지 확인
            if (await fileExists(filePath)) {
                const newFileName = await generateFileName(baseName, ext, path.join(basePath, 'add_upload'));
                filePath = path.join(basePath, 'add_upload', newFileName);
            }

            await fs.rename(req.file.path, filePath); // 업로드된 파일을 새로운 경로로 이동

            console.log('Additional file upload successful:', filePath); // 콘솔에 업로드 성공 메시지 출력
            res.send('Additional file upload successful'); // 클라이언트에 업로드 성공 메시지 응답
        } else {
            console.log('No additional file provided'); // 업로드된 파일이 없을 경우
            res.status(400).send('No additional file provided'); // 클라이언트에 오류 메시지 응답
        }
    } catch (err) {
        console.error(err); // 오류가 발생한 경우 콘솔에 출력
        res.status(500).send('Internal server error'); // 클라이언트에 내부 서버 오류 메시지 응답
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
