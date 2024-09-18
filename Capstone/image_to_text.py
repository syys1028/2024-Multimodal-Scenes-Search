import os
import cv2
import matplotlib.pyplot as plt
import natsort
import numpy as np
from paddleocr import PaddleOCR, draw_ocr
from PIL import ImageFont, ImageDraw, Image
import db_connect

# �̹����� ȭ�鿡 ǥ���ϴ� �Լ�
def plt_imshow(title='image', img=None, figsize=(8, 5)):
    plt.figure(figsize=figsize)
    if type(img) is str:
        img = cv2.imread(img)  # ���� ��ο��� �̹��� �б�
    if type(img) == list:   # plt �̹����� ������ ���� ���
        if type(title) == list:
            titles = title
        else:
            titles = [title] * len(img) 
        for i in range(len(img)):
            if len(img[i].shape) <= 2:
                rgbImg = cv2.cvtColor(img[i], cv2.COLOR_GRAY2RGB)  # �׷��̽������� RGB�� ��ȯ
            else:
                rgbImg = cv2.cvtColor(img[i], cv2.COLOR_BGR2RGB)  # BGR�� RGB�� ��ȯ
            plt.subplot(1, len(img), i + 1), plt.imshow(rgbImg)  # �����÷Կ� �̹��� ǥ��
            plt.title(titles[i])
            plt.xticks([]), plt.yticks([])  # �� ���� ����
        plt.show(block=False)
        plt.pause(0.5)
        plt.close()
    else:
        if len(img.shape) < 3:
            rgbImg = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)  # �׷��̽������� RGB�� ��ȯ
        else:
            rgbImg = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)  # BGR�� RGB�� ��ȯ
        plt.imshow(rgbImg)  # �̹��� ǥ��
        plt.title(title)
        plt.xticks([]), plt.yticks([])  # �� ���� ����
        plt.show(block=False)
        plt.pause(0.5)
        plt.close()

# �̹����� �ؽ�Ʈ�� �����ϴ� �Լ�
def put_text(image, text, x, y, color=(0, 255, 0), font_size=22):
    if type(image) == np.ndarray:
        color_converted = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)  # BGR�� RGB�� ��ȯ
        image = Image.fromarray(color_converted)  # OpenCV �̹����� PIL �̹����� ��ȯ
    font = 'malgun.ttf'  # ����� ��Ʈ ���� ����
    image_font = ImageFont.truetype(font, font_size)
    draw = ImageDraw.Draw(image)
    draw.text((x, y), text, font=image_font, fill=color)  # �ؽ�Ʈ �׸���
    numpy_image = np.array(image)  # PIL �̹����� numpy �迭�� ��ȯ
    opencv_image = cv2.cvtColor(numpy_image, cv2.COLOR_RGB2BGR)  # RGB�� BGR�� ��ȯ
    return opencv_image

# OCR ó���� ���� Ŭ����
class MyPaddleOCR:
    def __init__(self, lang="korean", **kwargs):
        self.lang = lang
        self._ocr = PaddleOCR(lang=lang, show_log=False)  # PaddleOCR �ʱ�ȭ
        self.img_path = None
        self.ocr_result = None

    # OCR�� �����ϴ� �Լ�
    def run_ocr(self, img_path: str, debug: bool = False):
        self.img_path = img_path
        ocr_text = []
        result = self._ocr.ocr(img_path, cls=False)  # OCR ����
        self.ocr_result = result[0] if result else None
        if self.ocr_result:
            lines = self.group_by_lines(self.ocr_result)  # ����� �������� �׷�ȭ
            for line in lines:
                for r in line:
                    ocr_text.append(r[1][0])  # �ؽ�Ʈ ����
        else:
            ocr_text = []
        if debug:
            self.show_img_with_ocr()  # ����� ��忡�� OCR ��� ǥ��
        return " ".join(ocr_text)

    # OCR ����� ���� ������ �׷�ȭ�ϴ� �Լ�
    def group_by_lines(self, ocr_results):
        lines = []
        for result in ocr_results:
            added = False
            for line in lines:
                if abs(result[0][0][1] - line[0][0][0][1]) < 20:  # ���� ���ο� �ִ��� Ȯ��
                    line.append(result)
                    added = True
                    break
            if not added:
                lines.append([result])  # ���ο� ���� �߰�
        
        # for line in lines:
        #     line.sort(key=lambda x: x[0][0][0])  # ���� �� ����
        # lines.sort(key=lambda x: x[0][0][1])  # ��ü ���� ����
        
        return lines

    # OCR ����� ������ �̹����� ȭ�鿡 ǥ���ϴ� �Լ�
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
                cv2.line(roi_img, topLeft, topRight, (0, 255, 0), 2)  # ��� ��
                cv2.line(roi_img, topRight, bottomRight, (0, 255, 0), 2)  # ������ ��
                cv2.line(roi_img, bottomRight, bottomLeft, (0, 255, 0), 2)  # �ϴ� ��
                cv2.line(roi_img, bottomLeft, topLeft, (0, 255, 0), 2)  # ���� ��
                roi_img = put_text(roi_img, text, topLeft[0], topLeft[1] - 20, font_size=15)  # �ؽ�Ʈ ����
        #     plt_imshow("ROI", roi_img, figsize=(8, 8))  # ��� �̹��� ǥ��
        # else:
        #     plt_imshow("Original Image", img, figsize=(8, 8))  # ���� �̹��� ǥ��

# �̹����� �а� OCR�� �����ϴ� �Լ�
def read(image):
    ocr = MyPaddleOCR()
    result = ocr.run_ocr(image, debug=True)  # OCR ����
    return result

# ������ ���� ���� ��� �̹��� ���Ͽ� ���� OCR�� �����ϰ� ����� �����ͺ��̽��� �����ϴ� �Լ�
def make_texts(name):
    path = f"C:/Users/UBIT/frame/{name}/"
    file_list = os.listdir(path)  # ���� �� ���� ���
    file_list_img = [file for file in file_list if file.endswith('.png')]  # PNG ���ϸ� ���͸�
    file_list_img = natsort.natsorted(file_list_img)  # �ڿ� ����
    file_name = [os.path.splitext(file)[0] for file in file_list_img]
    last_text = None
    for count, img_file in enumerate(file_list_img):
        print(f"\n{img_file}")
        img_path = os.path.join(path, img_file)
        text = read(img_path)  # �̹������� �ؽ�Ʈ �б�
        if text:
            print(f"['{text}']")
            if last_text is None or text.strip() != last_text.strip():  # �ߺ� �ؽ�Ʈ üũ
                input_text_db(name, file_name[count], text)  # �����ͺ��̽��� �Է�
                last_text = text
        else:
            print('[]')
            input_text_db(name, file_name[count], None)  # �ؽ�Ʈ�� ���� ���

# �� ���� �ð��� ��:��:�� �������� ��ȯ�ϴ� �Լ�
def seconds_to_hhmmss(seconds):
    seconds = int(seconds)
    hours = seconds // 3600  # �ð� ���
    minutes = (seconds % 3600) // 60  # �� ���
    seconds = seconds % 60  # �� ���
    return f"{hours:02}:{minutes:02}:{seconds:02}"  # ���Ŀ� �°� ��ȯ

# OCR ����� �����ͺ��̽��� �����ϴ� �Լ�
def input_text_db(name, frame_sec, text):
    conn = db_connect.dbconnect()  # �����ͺ��̽� ����
    cur = conn.cursor()
    seconds_to_str = seconds_to_hhmmss(frame_sec)  # �ʸ� ��:��:�ʷ� ��ȯ
    if isinstance(text, list):
        text = ' '.join(text)  # �ؽ�Ʈ ����Ʈ�� ���ڿ��� ��ȯ
    sql = "INSERT INTO datatable_v4 (movieName, timeStamp, subtext) VALUES (%s, %s, %s)"
    val = (name, seconds_to_str, text)
    cur.execute(sql, val)  # SQL ����
    conn.commit()
    conn.close()  # �����ͺ��̽� ���� ����

# ���� �̹����� ���� OCR�� �����ϰ� ����� �����ͺ��̽��� �����ϴ� �Լ�
def process_single_image(image_path):
    text = read(image_path)  # �̹������� �ؽ�Ʈ �б�
    if text:
        print(f"['{text}']")
        input_single_image_db(image_path, text)  # �����ͺ��̽��� �Է�
    else:
        print('[]')
        input_single_image_db(image_path, None)  # �ؽ�Ʈ�� ���� ���

# ���� �̹����� OCR ����� �����ͺ��̽��� �����ϴ� �Լ�
def input_single_image_db(image_path, text):
    conn = db_connect.dbconnect()  # �����ͺ��̽� ����
    cur = conn.cursor()
    name = os.path.splitext(os.path.basename(image_path))[0]  # ���� �̸����� Ȯ���� ����
    if name.startswith('(') and ')' in name:
            name = name.split(')', 1)[1].strip()  # Ư������ ó��
    if isinstance(text, list):
        text = ' '.join(text)  # �ؽ�Ʈ ����Ʈ�� ���ڿ��� ��ȯ
    sql = "INSERT INTO addtable (fileName, type, subText, placeText) VALUES (%s, %s, %s, %s)"
    val = (name, 'image', text, None)  # placeText�� �ʿ����� �ʴٰ� ����
    cur.execute(sql, val)  # SQL ����
    conn.commit()
    conn.close()  # �����ͺ��̽� ���� ����