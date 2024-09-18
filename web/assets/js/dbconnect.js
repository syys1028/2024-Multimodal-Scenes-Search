const mysql = require("mysql2");

// MySQL 데이터베이스 연결 풀 생성
const pool = mysql.createPool({
  host: "202.31.147.126", // MySQL 서버의 호스트
  user: "root", // MySQL 사용자의 이름
  database: "videoData", // 사용할 데이터베이스 이름
  password: "5159", // MySQL 사용자의 비밀번호
  waitForConnections: true, // 연결이 모두 사용 중일 때 대기할지 여부
  connectionLimit: 10, // 연결 풀의 최대 연결 수
  queueLimit: 0, // 대기열의 최대 연결 요청 수 (0은 무제한)
});

// 데이터베이스에서 사용자 조회
const getUsers = async () => {
  const promisePool = pool.promise(); // 프로미스 기반 API 사용
  const [rows] = await promisePool.query("SELECT * FROM datatable;"); // SQL 쿼리 실행
  console.log(rows); // 결과 출력
};

// getUsers 함수 호출
getUsers().catch((err) => console.error("Error:", err.message));
