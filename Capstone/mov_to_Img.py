import os
import cv2
import matplotlib.pyplot as plt

# 디렉토리를 생성하는 함수
def createDir(directory):
    try:
        os.mkdir("C:/Users/UBIT/frame/" + directory)    # 지정된 경로에 디렉토리 생성
    except Exception as e:
        print(e)
        
# 동영상을 프레임 단위로 이미지를 추출하여 저장하는 함수
def movies_to_img(movie_name, vidcap): 
    createDir(movie_name)  # 동영상 이름으로 디렉토리 생성
    frame_count = 0  # 현재 프레임 수 초기화
    frame_interval = 36  # 프레임 간격 설정 (36프레임마다 이미지 추출)
    frame_rate = vidcap.get(cv2.CAP_PROP_FPS)  # 동영상의 초당 프레임 수

    while vidcap.isOpened():
        ret, image = vidcap.read()  # 동영상에서 프레임 읽기
        if not ret:
            break   # 더 이상 읽을 프레임이 없으면 종료
        # 36프레임당 한 장의 이미지 추출 (약 1.5초 간격)
        if frame_count % frame_interval == 0:
            time_sec = frame_count / frame_rate  # 현재 시간(초) 계산
            time_sec_int = round(time_sec)  # 시간을 정수로 변환
            #print(f'Saved frame number: {frame_count}, Time: {time_sec_int}')
            cv2.imwrite(f"C:/Users/UBIT/frame/{movie_name}/{time_sec_int}.png", image)
            # 이미지를 화면에 표시
            # plt.imshow(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
            # plt.show(block=False)
            # plt.pause(0.5)
            # plt.close()
        frame_count += 1  # 프레임 수 증가
    print('<vidcap end>\n')
    vidcap.release()  # 동영상 캡처 객체 해제