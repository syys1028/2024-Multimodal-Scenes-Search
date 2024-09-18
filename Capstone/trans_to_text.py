import os
import googletrans
import db_connect
import time

# 번역 파일이 처리된 파일 목록을 기록할 파일 경로
PROCESSED_FILES_RECORD = 'C:/Users/UBIT/Capstone/trans_processed_files.txt'

# 데이터베이스 연결
def fetch_movie_datatable_v3(movie_name):
    conn = db_connect.dbconnect()
    cursor = conn.cursor()
    
    # 영화 이름을 기반으로 데이터베이스에서 정보 조회
    sql_select = "SELECT timeStamp, subText, voiceText, placeText, isMainActor FROM datatable_v3 WHERE movieName = %s"
    cursor.execute(sql_select, (movie_name,))
    rows = cursor.fetchall()
    
    # 연결 종료
    conn.close()
    return rows

# 처리된 파일 목록을 로드하는 함수
def load_processed_files():
    if not os.path.exists(PROCESSED_FILES_RECORD):
        return set()  # 파일이 없으면 빈 세트 반환
    with open(PROCESSED_FILES_RECORD, 'r') as f:
        processed_files = f.read().splitlines()  # 파일에서 읽어와 세트로 변환하여 반환
    return set(processed_files)

# 처리된 파일을 기록하는 함수
def save_processed_file(file_name):
    processed_files = load_processed_files()
    if file_name not in processed_files:
        with open(PROCESSED_FILES_RECORD, 'a') as f:
            f.write(file_name + '\n')  # 파일 이름을 기록

# 텍스트를 번역하는 함수
def translate_text(translator, text, dest_lang):
    try:
        if text != None and text != 'none':
            translation = translator.translate(text, dest=dest_lang, src='auto')
            return translation.text  # 번역된 텍스트 반환
        else:
            return "NULL"
    except Exception as e:
        print(f"Error translating text: {text}. Error: {e}")
        return ""  # 번역 중 오류 발생 시 빈 문자열 반환

# 번역 파일을 생성하는 함수
def create_translation_file(year, movie_name, lang, include_subtitles, include_voice, include_scenes):
    translator = googletrans.Translator()
    movie_data = fetch_movie_datatable_v3(movie_name)  # 영화 데이터 조회
    path = 'C:/Users/UBIT/translate'  # 번역 파일 저장 경로
    if year == None:
        filename = f"{movie_name}_{lang}_{include_subtitles}{include_voice}{include_scenes}.txt"  # 파일 이름 생성    
    filename = f"({year}) {movie_name}_{lang}_{include_subtitles}{include_voice}{include_scenes}.txt"  # 파일 이름 생성
    filepath = os.path.join(path, filename)  # 파일 경로 생성
    
    with open(filepath, 'w', encoding='utf-8') as file:
        for row in movie_data:
            timestamp, sub_text, voice_text, place_text, is_main_actor = row
            
            # 필요에 따라 자막, 음성, 장소 텍스트를 번역하여 파일에 기록
            translated_sub_text = translate_text(translator, sub_text, lang) if include_subtitles == 'T' else ""
            translated_voice_text = translate_text(translator, voice_text, lang) if include_voice == 'T' else ""
            translated_scene_text = translate_text(translator, place_text, lang) if include_scenes == 'T' else ""

            # ..? 잠만 여기 알고리즘 좀 다시
            if include_subtitles == 'T':
                translated_sub_text = translated_sub_text + ' | '
            if include_voice == 'T':
                translated_voice_text = translated_voice_text + ' | '
            if include_scenes == 'T':
                translated_scene_text = translated_scene_text + ' | '

            file.write(f"{timestamp} | {translated_sub_text}{translated_voice_text}{translated_scene_text}{'Y' if is_main_actor else 'N'}\n")
        file.write("< end >\n")

    print(f"Translation file created: {filename}")  # 번역 파일 생성 완료 메시지 출력
    save_processed_file(filename)  # 처리된 파일 목록에 파일 이름 기록

# 파일 이름을 파싱하여 영화 이름, 언어, 자막 여부, 음성 여부, 장소 여부 추출
def parse_file_name(file_name):
    parts = file_name.split('_')
    year = None
    if '(' in parts[0] and ')' in parts[0]:
        year = parts[0].split('(')[1].split(')')[0]

    movie_name = parts[0]
    if movie_name.startswith('(') and ')' in movie_name:
        movie_name = movie_name.split(')')[1].strip()

    lang = parts[1]
    include_subtitles = 'T' if 'T' in parts[2][0] else 'F'
    include_voice = 'T' if 'T' in parts[2][1] else 'F'
    include_scenes = 'T' if 'T' in parts[2][2] else 'F'
    
    return year, movie_name, lang, include_subtitles, include_voice, include_scenes

# 폴더를 검색하여 처리되지 않은 파일을 찾고 번역 파일을 생성하는 함수
def search_folder():
    print("Trans Upload Search Time: ", time.strftime('%Y-%m-%d %H:%M:%S'))
    os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'
    path = 'C:/Users/UBIT/translate'  # 검색할 폴더 경로
    
    processed_files = load_processed_files()  # 처리된 파일 목록 로드
    
    for file in os.listdir(path):
        if file.endswith('.txt') and file not in processed_files:
            year, movie_name, lang, include_subtitles, include_voice, include_scenes = parse_file_name(file)
            print(year, movie_name, lang, include_subtitles, include_voice, include_scenes)
            create_translation_file(year, movie_name, lang, include_subtitles, include_voice, include_scenes)  # 번역 파일 생성

            save_processed_file(file)  # 처리된 파일 목록에 기록
            print(f"Processed file: {file}\n")  # 처리 완료된 파일 이름 출력
    print('<trans-upload end>\n\n')