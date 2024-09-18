import os
import cv2
import matplotlib.pyplot as plt

# ���丮�� �����ϴ� �Լ�
def createDir(directory):
    try:
        os.mkdir("C:/Users/UBIT/frame/" + directory)    # ������ ��ο� ���丮 ����
    except Exception as e:
        print(e)
        
# �������� ������ ������ �̹����� �����Ͽ� �����ϴ� �Լ�
def movies_to_img(movie_name, vidcap): 
    createDir(movie_name)  # ������ �̸����� ���丮 ����
    frame_count = 0  # ���� ������ �� �ʱ�ȭ
    frame_interval = 36  # ������ ���� ���� (36�����Ӹ��� �̹��� ����)
    frame_rate = vidcap.get(cv2.CAP_PROP_FPS)  # �������� �ʴ� ������ ��

    while vidcap.isOpened():
        ret, image = vidcap.read()  # �����󿡼� ������ �б�
        if not ret:
            break   # �� �̻� ���� �������� ������ ����
        # 36�����Ӵ� �� ���� �̹��� ���� (�� 1.5�� ����)
        if frame_count % frame_interval == 0:
            time_sec = frame_count / frame_rate  # ���� �ð�(��) ���
            time_sec_int = round(time_sec)  # �ð��� ������ ��ȯ
            #print(f'Saved frame number: {frame_count}, Time: {time_sec_int}')
            cv2.imwrite(f"C:/Users/UBIT/frame/{movie_name}/{time_sec_int}.png", image)
            # �̹����� ȭ�鿡 ǥ��
            # plt.imshow(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
            # plt.show(block=False)
            # plt.pause(0.5)
            # plt.close()
        frame_count += 1  # ������ �� ����
    print('<vidcap end>\n')
    vidcap.release()  # ������ ĸó ��ü ����