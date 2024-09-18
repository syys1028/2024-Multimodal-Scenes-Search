import os
import time
import image_to_text       # 이미지를 문자로 변환 모듈
import mp3_to_text         # 음성을 문자로 변환 모듈
import place_to_text       # 장소 카테고리 별 분류 모듈
import db_connect          # DB 연결 모듈

'''
    < 주요 작업 >
        1. search_folder 함수는 지정된 폴더에서 파일을 검색합니다.
        2. 이미지 파일을 처리하여 텍스트와 장소 정보를 추출하고 DB에 저장합니다.
        3. 오디오 파일을 처리하여 텍스트를 추출하고 DB에 저장합니다.
        4. 텍스트 파일을 읽어 DB에 저장합니다.
        5. 처리된 파일 목록을 업데이트하여 중복 처리를 방지합니다.
'''

PROCESSED_FILES_RECORD = 'C:/Users/UBIT/Capstone/add_processed_files.txt'

# 텍스트를 addtable에 삽입하는 함수
def insert_text_into_addtable(movie_name, text):
    conn = db_connect.dbconnect()  # DB 연결
    cur = conn.cursor()

    movie_name = os.path.splitext(movie_name)[0]  # 파일 이름에서 확장자 제거
    if movie_name.startswith('(') and ')' in movie_name:
        movie_name = movie_name.split(')', 1)[1].strip()  # 특수문자 처리

    sql_insert = "INSERT INTO addtable (fileName, type, subText) VALUES (%s, %s, %s)"
    val = (movie_name, 'text', text)
    cur.execute(sql_insert, val)  # SQL 실행
    
    conn.commit()  # 변경사항 커밋
    conn.close()  # DB 연결 종료

# 처리된 파일 목록을 로드하는 함수
def load_processed_files():
    if not os.path.exists(PROCESSED_FILES_RECORD):
        return set()  # 파일이 없으면 빈 집합 반환
    with open(PROCESSED_FILES_RECORD, 'r') as f:
        processed_files = f.read().splitlines()
    return set(processed_files)  # 처리된 파일 집합 반환

# 처리된 파일 이름을 저장하는 함수
def save_processed_file(file_name):
    with open(PROCESSED_FILES_RECORD, 'a') as f:
        f.write(file_name + '\n')  # 파일 이름을 기록

# 폴더를 검색하고 처리하는 함수
def search_folder():
    os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'
    print("Add Upload Search Time: ", time.strftime('%Y-%m-%d %H:%M:%S'))
    
    image_path = 'C:/Users/UBIT/frame/add_upload'
    audio_path = 'C:/Users/UBIT/mp3/add_upload'
    text_path = 'C:/Users/UBIT/texts/add_upload'

    processed_files = load_processed_files()  # 처리된 파일 목록 로드
    
    # 이미지 파일 처리
    for file in os.listdir(image_path):
        if (file.endswith('.png') or file.endswith('.jpg')) and file not in processed_files:
            print(f'Processing image file: {file}')
            image_to_text.process_single_image(os.path.join(image_path, file))  # 이미지에서 텍스트 추출
            place_to_text.process_single_image(file, os.path.join(image_path, file))  # 장소 분류 처리
            save_processed_file(file)  # 처리된 파일 기록
            print('\n')

    # 오디오 파일 처리
    for file in os.listdir(audio_path):
        if (file.endswith('.mp3') or file.endswith('.wav')) and file not in processed_files:
            print(f'Processing audio file: {file}')
            mp3_to_text.single_audio_to_text(file)  # 오디오에서 텍스트 추출
            save_processed_file(file)  # 처리된 파일 기록
            print('\n')

    # 텍스트 파일 처리
    for file in os.listdir(text_path):
        if file.endswith('.txt') and file not in processed_files:
            with open(os.path.join(text_path, file), 'r', encoding='utf-8') as f:
                text = f.read()  # 텍스트 파일 읽기
            insert_text_into_addtable(file, text)  # 텍스트를 DB에 삽입
            save_processed_file(file)  # 처리된 파일 기록

            print(f'Processed text file: {file}')
    print('<add-upload end>\n')