import os
import db_connect
import whisper_timestamped as whisper

# 초 단위 시간을 시:분:초 형식으로 변환하는 함수
def seconds_to_hhmmss(seconds):
    seconds = int(seconds)
    hours = seconds // 3600  # 시간 계산
    minutes = (seconds % 3600) // 60  # 분 계산
    seconds = seconds % 60  # 초 계산
    time_str = f"{hours:02}:{minutes:02}:{seconds:02}"  # 시:분:초 형식의 문자열 반환
    return time_str

# 데이터베이스에서 특정 시간 범위의 타임스탬프를 검색하고 업데이트하는 함수
def search_db_timestamp(name, start_time, end_time, sentence):
    conn = db_connect.dbconnect()  # 데이터베이스 연결
    cur = conn.cursor()

    start_time_str = seconds_to_hhmmss(start_time)  # 시작 시간을 시:분:초로 변환
    end_time_str = seconds_to_hhmmss(end_time)  # 종료 시간을 시:분:초로 변환

    sql_select = "SELECT timeStamp FROM datatable_v3 WHERE movieName = %s AND timeStamp BETWEEN %s AND %s"
    cur.execute(sql_select, (name, start_time_str, end_time_str))  # 타임스탬프 검색
    rows = cur.fetchall()

    if rows:
        first_timestamp = rows[0][0]  # 첫 번째 타임스탬프
        sql_update = "UPDATE datatable_v3 SET voiceText = CONCAT(IFNULL(voiceText, ''), %s) WHERE movieName = %s AND timeStamp = %s"
        cur.execute(sql_update, (sentence, name, first_timestamp))  # voiceText 업데이트
    
    conn.commit()  # 변경사항 커밋
    conn.close()  # 데이터베이스 연결 종료

# 오디오 파일을 텍스트로 변환하고 데이터베이스에 저장하는 함수
def audio_to_text(movie_name):
    audio = whisper.load_audio("C:/Users/UBIT/mp3/" + movie_name + ".wav")  # 오디오 파일 로드
    model = whisper.load_model("small")  # Whisper 모델 로드
    result = whisper.transcribe(model, audio, language="en")  # 오디오 텍스트 변환

    for segment in result['segments']:
        start_time = segment['start']  # 시작 시간
        end_time = segment['end']  # 종료 시간
        sentence = segment['text']  # 텍스트

        search_db_timestamp(movie_name, start_time, end_time, sentence)  # 데이터베이스에 저장

# 단일 오디오 파일을 텍스트로 변환하고 데이터베이스에 저장하는 함수
def single_audio_to_text(movie_name):
    audio = whisper.load_audio("C:/Users/UBIT/mp3/add_upload/" + movie_name)  # 오디오 파일 로드
    model = whisper.load_model("small")  # Whisper 모델 로드
    result = whisper.transcribe(model, audio, language="en")  # 오디오 텍스트 변환

    sentences = []

    for segment in result['segments']:
        sentence = segment['text']  # 텍스트
        sentences.append(sentence)  # 텍스트 추가

    voice_text = ' '.join(sentences)  # 모든 텍스트를 하나의 문자열로 결합
    insert_into_addtable(movie_name, voice_text)  # 데이터베이스에 저장

# 텍스트를 데이터베이스에 삽입하는 함수
def insert_into_addtable(movie_name, voice_text):
    conn = db_connect.dbconnect()  # 데이터베이스 연결
    cur = conn.cursor()

    movie_name = os.path.splitext(movie_name)[0]  # 파일 이름에서 확장자 제거
    if movie_name.startswith('(') and ')' in movie_name:
        movie_name = movie_name.split(')', 1)[1].strip()  # 특수문자 처리

    sql_insert = "INSERT INTO addtable (fileName, type, voiceText) VALUES (%s, %s, %s)"
    val = (movie_name, 'audio', voice_text)
    cur.execute(sql_insert, val)  # SQL 실행
    
    conn.commit()  # 변경사항 커밋
    conn.close()  # 데이터베이스 연결 종료