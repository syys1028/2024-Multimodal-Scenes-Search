import os
import cv2
import schedule
import time
import moviepy.editor as mp
import mov_to_Img          # 동영상을 이미지로 변환 모듈
import image_to_text       # 이미지를 문자로 변환 모듈
import mp3_to_text         # 음성을 문자로 변환 모듈
import place_to_text       # 장소 카테고리 별 분류 모듈
import db_connect          # DB 연결 모듈
import add_upload_all      # 추가 업로드 모듈
import trans_to_text       # 번역 파일 생성 모듈

'''
    < 주요 작업 >
        1. mp4 파일을 검색하고 파일 이름을 처리합니다.
        2. frame 디렉토리가 존재하지 않으면 동영상을 이미지로 변환하고, 이미지를 텍스트로 변환합니다.
        3. 동영상에서 오디오를 추출하여 텍스트로 변환합니다.
        4. 장소 카테고리를 분류하여 데이터베이스에 저장합니다.
        5. 작업을 완료한 동영상의 이미지는 삭제합니다.
        6. 추가 업로드 모듈과 번역 파일 생성 모듈을 호출합니다.
        7. 이 작업은 매 1분마다 실행됩니다.
'''

# 디렉토리 내 파일을 삭제하는 함수
def clear_directory(directory):
    for filename in os.listdir(directory):
        file_path = os.path.join(directory, filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)  # 파일 삭제
            elif os.path.isdir(file_path):
                clear_directory(file_path)  # 하위 디렉토리 내 파일 삭제 후 디렉토리 삭제
                os.rmdir(file_path)  # 빈 디렉토리 삭제
        except Exception as e:
            print(f'Failed to delete {file_path}. Reason: {e}')


# 메인 업로드 검색 및 처리 함수
def search_input():
    os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'
    print("Main Upload Search time : ", time.strftime('%Y-%m-%d %H:%M:%S'))
    
    path = 'C:/Users/UBIT/movie'
    file_list = os.listdir(path)
    # .mp4 확장자의 파일 목록을 필터링
    file_list_img = [file for file in file_list if file.endswith('.mp4') or file.endswith('.MP4')]
    file_name = []
    ori_file_name = []

    # 파일 이름 처리
    for file in file_list_img:
        if file.count(".") == 1: 
            name = file.split('.')[0]
            file_name.append(name)
        else:
            for k in range(len(file)-1, 0, -1):
                if file[k] == '.':
                    file_name.append(file[:k])
                    break     
                    
    for f in file_name:
        # 원본 파일 이름과 가공된 파일 이름 설정
        if f.startswith('(') and ')' in f:
            ori_file_name = f
            f = f.split(')', 1)[1].strip()
        else:
            ori_file_name = f

        # frame 폴더에 디렉토리가 존재하지 않으면 새로운 디렉토리 생성
        frame_path = 'C:/Users/UBIT/frame/' + f
        if not os.path.isdir(frame_path):
            vidcap = cv2.VideoCapture('C:/Users/UBIT/movie/' + str(ori_file_name) + '.mp4')
            mov_to_Img.movies_to_img(f, vidcap)  # 동영상을 이미지로 변환 모듈 호출
            image_to_text.make_texts(f)  # 이미지를 문자로 변환 모듈 호출
            
            # 오디오 추출 및 저장
            clip = mp.VideoFileClip("C:/Users/UBIT/movie/" + str(ori_file_name) + ".mp4")
            clip.audio.write_audiofile("C:/Users/UBIT/mp3/" + f + ".wav")
            
            mp3_to_text.audio_to_text(f)  # 음성을 문자로 변환 모듈 호출
            place_to_text.place_to_text_model(f)  # 장소 카테고리 별 분류 모듈 호출
            db_connect.dbconnect()  # DB 연결 모듈 호출

            # 처리 후 이미지 파일 삭제
            clear_directory(frame_path)
            
    print('<final-upload end>\n')

    add_upload_all.search_folder()  # 추가 업로드 모듈 호출
    trans_to_text.search_folder()  # 번역 파일 생성 모듈 호출

# 스케줄 설정: 매 1.5초마다 search_input 함수 실행
schedule.every(0.02).minutes.do(search_input)
# schedule.every().day.at("17:08").do(search_input)  # 특정 시간에 실행하고 싶을 경우 사용

# 스케줄 실행 루프
while True:
    schedule.run_pending()  # 예약된 작업 실행
    time.sleep(1)  # 1초 대기