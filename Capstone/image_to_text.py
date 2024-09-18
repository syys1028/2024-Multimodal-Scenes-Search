import os
import cv2
import matplotlib.pyplot as plt
import natsort
import numpy as np
from paddleocr import PaddleOCR, draw_ocr
from PIL import ImageFont, ImageDraw, Image
import db_connect

# 이미지를 화면에 표시하는 함수
def plt_imshow(title='image', img=None, figsize=(8, 5)):
    plt.figure(figsize=figsize)
    if type(img) is str:
        img = cv2.imread(img)  # 파일 경로에서 이미지 읽기
    if type(img) == list:   # plt 이미지에 동일한 제목 사용
        if type(title) == list:
            titles = title
        else:
            titles = [title] * len(img) 
        for i in range(len(img)):
            if len(img[i].shape) <= 2:
                rgbImg = cv2.cvtColor(img[i], cv2.COLOR_GRAY2RGB)  # 그레이스케일을 RGB로 변환
            else:
                rgbImg = cv2.cvtColor(img[i], cv2.COLOR_BGR2RGB)  # BGR을 RGB로 변환
            plt.subplot(1, len(img), i + 1), plt.imshow(rgbImg)  # 서브플롯에 이미지 표시
            plt.title(titles[i])
            plt.xticks([]), plt.yticks([])  # 축 눈금 제거
        plt.show(block=False)
        plt.pause(0.5)
        plt.close()
    else:
        if len(img.shape) < 3:
            rgbImg = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)  # 그레이스케일을 RGB로 변환
        else:
            rgbImg = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)  # BGR을 RGB로 변환
        plt.imshow(rgbImg)  # 이미지 표시
        plt.title(title)
        plt.xticks([]), plt.yticks([])  # 축 눈금 제거
        plt.show(block=False)
        plt.pause(0.5)
        plt.close()

# 이미지에 텍스트를 삽입하는 함수
def put_text(image, text, x, y, color=(0, 255, 0), font_size=22):
    if type(image) == np.ndarray:
        color_converted = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)  # BGR을 RGB로 변환
        image = Image.fromarray(color_converted)  # OpenCV 이미지를 PIL 이미지로 변환
    font = 'malgun.ttf'  # 사용할 폰트 파일 지정
    image_font = ImageFont.truetype(font, font_size)
    draw = ImageDraw.Draw(image)
    draw.text((x, y), text, font=image_font, fill=color)  # 텍스트 그리기
    numpy_image = np.array(image)  # PIL 이미지를 numpy 배열로 변환
    opencv_image = cv2.cvtColor(numpy_image, cv2.COLOR_RGB2BGR)  # RGB를 BGR로 변환
    return opencv_image

# OCR 처리를 위한 클래스
class MyPaddleOCR:
    def __init__(self, lang="korean", **kwargs):
        self.lang = lang
        self._ocr = PaddleOCR(lang=lang, show_log=False)  # PaddleOCR 초기화
        self.img_path = None
        self.ocr_result = None

    # OCR을 실행하는 함수
    def run_ocr(self, img_path: str, debug: bool = False):
        self.img_path = img_path
        ocr_text = []
        result = self._ocr.ocr(img_path, cls=False)  # OCR 실행
        self.ocr_result = result[0] if result else None
        if self.ocr_result:
            lines = self.group_by_lines(self.ocr_result)  # 결과를 라인으로 그룹화
            for line in lines:
                for r in line:
                    ocr_text.append(r[1][0])  # 텍스트 추출
        else:
            ocr_text = []
        if debug:
            self.show_img_with_ocr()  # 디버그 모드에서 OCR 결과 표시
        return " ".join(ocr_text)

    # OCR 결과를 라인 단위로 그룹화하는 함수
    def group_by_lines(self, ocr_results):
        lines = []
        for result in ocr_results:
            added = False
            for line in lines:
                if abs(result[0][0][1] - line[0][0][0][1]) < 20:  # 같은 라인에 있는지 확인
                    line.append(result)
                    added = True
                    break
            if not added:
                lines.append([result])  # 새로운 라인 추가
        
        # for line in lines:
        #     line.sort(key=lambda x: x[0][0][0])  # 라인 내 정렬
        # lines.sort(key=lambda x: x[0][0][1])  # 전체 라인 정렬
        
        return lines

    # OCR 결과를 포함한 이미지를 화면에 표시하는 함수
    def show_img_with_ocr(self):
        img = cv2.imread(self.img_path)
        if self.ocr_result:
            roi_img = img.copy()
            for text_result in self.ocr_result:
                text = text_result[1][0]
                tlX = int(text_result[0][0][0])
                tlY = int(text_result[0][0][1])
                trX = int(text_result[0][1][0])
                trY = int(text_result[0][1][1])
                brX = int(text_result[0][2][0])
                brY = int(text_result[0][2][1])
                blX = int(text_result[0][3][0])
                blY = int(text_result[0][3][1])
                pts = ((tlX, tlY), (trX, trY), (brX, brY), (blX, blY))
                topLeft = pts[0]
                topRight = pts[1]
                bottomRight = pts[2]
                bottomLeft = pts[3]
                cv2.line(roi_img, topLeft, topRight, (0, 255, 0), 2)  # 상단 선
                cv2.line(roi_img, topRight, bottomRight, (0, 255, 0), 2)  # 오른쪽 선
                cv2.line(roi_img, bottomRight, bottomLeft, (0, 255, 0), 2)  # 하단 선
                cv2.line(roi_img, bottomLeft, topLeft, (0, 255, 0), 2)  # 왼쪽 선
                roi_img = put_text(roi_img, text, topLeft[0], topLeft[1] - 20, font_size=15)  # 텍스트 삽입
        #     plt_imshow("ROI", roi_img, figsize=(8, 8))  # 결과 이미지 표시
        # else:
        #     plt_imshow("Original Image", img, figsize=(8, 8))  # 원본 이미지 표시

# 이미지를 읽고 OCR을 수행하는 함수
def read(image):
    ocr = MyPaddleOCR()
    result = ocr.run_ocr(image, debug=True)  # OCR 수행
    return result

# 지정된 폴더 내의 모든 이미지 파일에 대해 OCR을 수행하고 결과를 데이터베이스에 저장하는 함수
def make_texts(name):
    path = f"C:/Users/UBIT/frame/{name}/"
    file_list = os.listdir(path)  # 폴더 내 파일 목록
    file_list_img = [file for file in file_list if file.endswith('.png')]  # PNG 파일만 필터링
    file_list_img = natsort.natsorted(file_list_img)  # 자연 정렬
    file_name = [os.path.splitext(file)[0] for file in file_list_img]
    last_text = None
    for count, img_file in enumerate(file_list_img):
        print(f"\n{img_file}")
        img_path = os.path.join(path, img_file)
        text = read(img_path)  # 이미지에서 텍스트 읽기
        if text:
            print(f"['{text}']")
            if last_text is None or text.strip() != last_text.strip():  # 중복 텍스트 체크
                input_text_db(name, file_name[count], text)  # 데이터베이스에 입력
                last_text = text
        else:
            print('[]')
            input_text_db(name, file_name[count], None)  # 텍스트가 없을 경우

# 초 단위 시간을 시:분:초 형식으로 변환하는 함수
def seconds_to_hhmmss(seconds):
    seconds = int(seconds)
    hours = seconds // 3600  # 시간 계산
    minutes = (seconds % 3600) // 60  # 분 계산
    seconds = seconds % 60  # 초 계산
    return f"{hours:02}:{minutes:02}:{seconds:02}"  # 형식에 맞게 반환

# OCR 결과를 데이터베이스에 저장하는 함수
def input_text_db(name, frame_sec, text):
    conn = db_connect.dbconnect()  # 데이터베이스 연결
    cur = conn.cursor()
    seconds_to_str = seconds_to_hhmmss(frame_sec)  # 초를 시:분:초로 변환
    if isinstance(text, list):
        text = ' '.join(text)  # 텍스트 리스트를 문자열로 변환
    sql = "INSERT INTO datatable_v4 (movieName, timeStamp, subtext) VALUES (%s, %s, %s)"
    val = (name, seconds_to_str, text)
    cur.execute(sql, val)  # SQL 실행
    conn.commit()
    conn.close()  # 데이터베이스 연결 종료

# 단일 이미지에 대해 OCR을 수행하고 결과를 데이터베이스에 저장하는 함수
def process_single_image(image_path):
    text = read(image_path)  # 이미지에서 텍스트 읽기
    if text:
        print(f"['{text}']")
        input_single_image_db(image_path, text)  # 데이터베이스에 입력
    else:
        print('[]')
        input_single_image_db(image_path, None)  # 텍스트가 없을 경우

# 단일 이미지의 OCR 결과를 데이터베이스에 저장하는 함수
def input_single_image_db(image_path, text):
    conn = db_connect.dbconnect()  # 데이터베이스 연결
    cur = conn.cursor()
    name = os.path.splitext(os.path.basename(image_path))[0]  # 파일 이름에서 확장자 제거
    if name.startswith('(') and ')' in name:
            name = name.split(')', 1)[1].strip()  # 특수문자 처리
    if isinstance(text, list):
        text = ' '.join(text)  # 텍스트 리스트를 문자열로 변환
    sql = "INSERT INTO addtable (fileName, type, subText, placeText) VALUES (%s, %s, %s, %s)"
    val = (name, 'image', text, None)  # placeText는 필요하지 않다고 가정
    cur.execute(sql, val)  # SQL 실행
    conn.commit()
    conn.close()  # 데이터베이스 연결 종료