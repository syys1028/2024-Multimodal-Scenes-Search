import torch
from torch.autograd import Variable as V
import torchvision.models as models
from torchvision import transforms as trn
from torch.nn import functional as F
import os
from PIL import Image
import cv2
import matplotlib.pyplot as plt
import numpy as np
import db_connect

# 초 단위 시간을 시:분:초 형식으로 변환하는 함수
def seconds_to_hhmmss(seconds):
    seconds = int(seconds)
    hours = seconds // 3600  # 시간 계산
    minutes = (seconds % 3600) // 60  # 분 계산
    seconds = seconds % 60  # 초 계산
    time_str = f"{hours:02}:{minutes:02}:{seconds:02}"  # 시:분:초 형식의 문자열 반환
    return time_str

# 데이터베이스에서 특정 타임스탬프를 검색하고 업데이트하는 함수
def search_db_timestamp(name, time, place_text):
    conn = db_connect.dbconnect()  # 데이터베이스 연결
    cur = conn.cursor()

    time_str = seconds_to_hhmmss(time)  # 초를 시:분:초로 변환

    sql_select = "SELECT timeStamp FROM datatable WHERE movieName = %s AND timeStamp = %s"
    cur.execute(sql_select, (name, time_str))  # 타임스탬프 검색
    rows = cur.fetchall()

    if rows:
        first_timestamp = rows[0][0]
        sql_update = "UPDATE datatable SET placeText = %s WHERE movieName = %s AND timeStamp = %s"
        cur.execute(sql_update, (place_text, name, first_timestamp))  # placeText 업데이트
    
    conn.commit()  # 변경사항 커밋
    conn.close()  # 데이터베이스 연결 종료

# 파일 이름을 가져오는 함수
def get_file_name(name):
    path = "C:/Users/UBIT/frame/" + name + "/"  # 폴더 경로 설정
    file_list = os.listdir(path)  # 폴더 내 파일 목록 가져오기
    file_list_img = [file for file in file_list if file.endswith('.png')]  # PNG 파일만 필터링
    file_name = [int(file.split('.')[0]) for file in file_list_img]  # 파일 이름에서 숫자 부분 추출
    file_list_img = [f"{fname}.png" for fname in sorted(file_name)]  # 정렬된 파일 이름 리스트 생성
    return path, file_name, file_list_img

# Places365 모델을 설정하고 불러오는 함수
def places365_model():
    arch = 'resnet50'  # 모델 아키텍처 설정
    model_file = 'resnet50_places365.pth.tar'  # 모델 파일 이름
    
    if not os.path.exists(model_file):  # 모델 파일이 없으면 다운로드
        weight_url = 'http://places2.csail.mit.edu/models_places365/resnet50_places365.pth.tar'
        os.system('wget ' + weight_url + ' -O ' + model_file)
    
    model = models.__dict__[arch](num_classes=365)  # 모델 초기화
    checkpoint = torch.load(model_file, map_location=lambda storage, loc: storage)  # 모델 체크포인트 로드
    state_dict = {str.replace(k, 'module.', ''): v for k, v in checkpoint['state_dict'].items()}  # 상태 딕셔너리 정리
    model.load_state_dict(state_dict)  # 모델 상태 로드
    model.eval()  # 모델 평가 모드 설정
    
    centre_crop = trn.Compose([
        trn.Resize((256, 256)),  # 크기 조정
        trn.CenterCrop(224),  # 중앙 자르기
        trn.ToTensor(),  # 텐서로 변환
        trn.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])  # 정규화
    ])
    
    file_name = 'categories_places365.txt'  # 카테고리 파일 이름
    if not os.path.exists(file_name):  # 카테고리 파일이 없으면 다운로드
        synset_url = 'https://raw.githubusercontent.com/csailvision/places365/master/categories_places365.txt'
        os.system('wget ' + synset_url + ' -O ' + file_name)
    
    classes = list()
    with open(file_name) as class_file:
        for line in class_file:
            classes.append(line.strip().split(' ')[0][3:])  # 카테고리 이름 추출
    classes = tuple(classes)  # 튜플로 변환
    
    return model, centre_crop, classes

# 카테고리 매핑을 설정하는 함수
def get_category_mapping():
    category_mapping = {
        "education": ["classroom", "library", "laboratory"],
        "restaurant": ["restaurant", "bar", "food_court"],
        "nature": ["sea", "canyon", "river", "forest"],
        "artificial": ["yard", "balcony", "fountain", "pavilion", "orchard"],
        "residence": ["kitchen", "living_room", "study", "balcony", "bedroom"],
        "accommodation": ["hotel_room", "camping_site"],
        "religious_medical": ["hospital", "health_center", "church", "temple"],
        "public": ["government_office", "bank", "park"],
        "transportation": ["taxi", "train", "car", "airplane"],
        "commercial": ["market", "supermarket", "shopping_mall"],
        "cultural_heritage": ["historical_site", "museum"],
        "sports_leisure": ["stadium", "ice_rink", "gym", "bowling_alley"],
        "entertainment": ["arcade", "pc_room", "amusement_park"],
        "performance": ["concert_hall", "stage", "theater"],
        "event_office": ["office", "conference_room", "wedding_hall", "cafeteria"],
        "building_interior": ["corridor", "stairs", "elevator"],
        "urban_environment": ["urban_street", "building_forest"],
        "road_transportation": ["overpass", "bridge", "crosswalk"],
        "art_exhibition": ["gallery", "exhibition"],
        "industrial": ["factory", "dam", "water_facility"]
    }
    
    fine_to_broad = {}
    for broad, fines in category_mapping.items():
        for fine in fines:
            fine_to_broad[fine] = broad  # 세부 카테고리를 광범위 카테고리로 매핑
            
    return category_mapping, fine_to_broad

# 이미지를 처리하는 함수
def process_image(img_cv2, centre_crop):
    img = Image.fromarray(cv2.cvtColor(img_cv2, cv2.COLOR_BGR2RGB))  # OpenCV 이미지를 PIL 이미지로 변환
    input_img = V(centre_crop(img).unsqueeze(0))  # 이미지를 모델 입력 형식으로 변환
    return input_img

# 장면을 분류하는 함수
def classify_scene(model, input_img, classes, fine_to_broad, category_mapping):
    with torch.no_grad():
        logit = model(input_img)  # 모델 추론
    h_x = F.softmax(logit, dim=1).squeeze()  # 소프트맥스 적용
    probs, idx = h_x.sort(0, True)  # 확률을 내림차순으로 정렬

    broad_category_probs = {broad: 0.0 for broad in category_mapping.keys()}  # 광범위 카테고리 확률 초기화
    subcategory_probs = {broad: [] for broad in category_mapping.keys()}  # 세부 카테고리 확률 초기화
    
    for j in range(len(classes)):
        fine_category = classes[idx[j]]  # 세부 카테고리 이름
        broad_category = fine_to_broad.get(fine_category, "Unknown")  # 세부 카테고리를 광범위 카테고리로 변환
        if broad_category != "Unknown":
            broad_category_probs[broad_category] += probs[j].item()  # 광범위 카테고리 확률 누적
            subcategory_probs[broad_category].append((fine_category, probs[j].item()))  # 세부 카테고리 확률 추가

    return broad_category_probs, subcategory_probs

# 비디오 프레임 이미지에서 장소 텍스트를 추출하는 함수
def place_to_text_model(name):
    model, centre_crop, classes = places365_model()  # 모델 초기화
    category_mapping, fine_to_broad = get_category_mapping()  # 카테고리 매핑 설정
    path, file_name, file_list_img = get_file_name(name)  # 파일 이름 및 경로 가져오기
    
    count = 0
    last_category = None
    scene_counter = 0
    smoothing_window = []
    window_size = 5
    confidence_threshold = 0.01  

    for img_file in file_list_img:
        img_cv2 = cv2.imread(path + img_file)  # 이미지 읽기
        input_img = process_image(img_cv2, centre_crop)  # 이미지 처리
        broad_category_probs, subcategory_probs = classify_scene(model, input_img, classes, fine_to_broad, category_mapping)  # 장면 분류

        smoothing_window.append(broad_category_probs)
        if len(smoothing_window) > window_size:
            smoothing_window.pop(0)  # 평활화 창 유지

        avg_broad_category_probs = {broad: np.mean([frame[broad] for frame in smoothing_window]) for broad in category_mapping.keys()}  # 평균 확률 계산
        sorted_broad_categories = sorted(avg_broad_category_probs.items(), key=lambda x: x[1], reverse=True)  # 확률 내림차순 정렬
        most_probable_category, most_probable_prob = sorted_broad_categories[0]

        # plt.figure(figsize=(8, 8))  # 새로운 그림 설정
        # plt.imshow(cv2.cvtColor(img_cv2, cv2.COLOR_BGR2RGB))  # 이미지 표시
        # plt.axis('off')  # 축 눈금 제거
        # plt.show(block=False)
        # plt.pause(5)  # 5초 대기
        # plt.close()

        print(f"Scene {count + 1}: {img_file}")
        print(f'{most_probable_prob:.3f} -> {most_probable_category}')
        subcategories = sorted(subcategory_probs[most_probable_category], key=lambda x: x[1], reverse=True)  # 세부 카테고리 확률 내림차순 정렬
        for subcategory, sub_prob in subcategories:
            print(f'    {sub_prob:.3f} -> {subcategory}')

        if most_probable_prob > confidence_threshold:  # 확률이 임계값보다 큰 경우
            if subcategories and subcategories[0][1] > 0:
                place_text = f"{most_probable_category} / {subcategories[0][0]}"  # 세부 카테고리 포함 텍스트 생성
            else:
                place_text = f"{most_probable_category} /"  # 세부 카테고리 없는 경우
            search_db_timestamp(name, int(img_file.split('.')[0]), place_text)  # 타임스탬프 검색 및 업데이트
        
        count += 1
        print('\n')

# 단일 이미지에서 장소 텍스트를 추출하는 함수
def process_single_image(name, image_path):
    confidence_threshold = 0.01
    model, centre_crop, classes = places365_model()  # 모델 초기화
    category_mapping, fine_to_broad = get_category_mapping()  # 카테고리 매핑 설정

    img_cv2 = cv2.imread(image_path)  # 이미지 읽기
    input_img = process_image(img_cv2, centre_crop)  # 이미지 처리
    broad_category_probs, subcategory_probs = classify_scene(model, input_img, classes, fine_to_broad, category_mapping)  # 장면 분류

    sorted_broad_categories = sorted(broad_category_probs.items(), key=lambda x: x[1], reverse=True)  # 확률 내림차순 정렬
    most_probable_category, most_probable_prob = sorted_broad_categories[0]

    plt.figure(figsize=(8, 8))  # 새로운 그림 설정
    plt.imshow(cv2.cvtColor(img_cv2, cv2.COLOR_BGR2RGB))  # 이미지 표시
    plt.axis('off')  # 축 눈금 제거
    plt.show(block=False)
    plt.pause(0.5)  # 0.5초 대기
    plt.close()

    print(f'{most_probable_prob:.3f} -> {most_probable_category}')
    subcategories = sorted(subcategory_probs[most_probable_category], key=lambda x: x[1], reverse=True)  # 세부 카테고리 확률 내림차순 정렬
    for subcategory, sub_prob in subcategories:
        print(f'    {sub_prob:.3f} -> {subcategory}')

    if most_probable_prob > confidence_threshold:  # 확률이 임계값보다 큰 경우
        if subcategories and subcategories[0][1] > 0:
            place_text = f"{most_probable_category} / {subcategories[0][0]}"  # 세부 카테고리 포함 텍스트 생성
        else:
            place_text = f"{most_probable_category} /"  # 세부 카테고리 없는 경우
        update_addtable(name, place_text)  # 추가 테이블 업데이트

# 단일 이미지의 OCR 결과를 데이터베이스에 저장하는 함수
def update_addtable(name, place_text):
    conn = db_connect.dbconnect()  # 데이터베이스 연결
    cur = conn.cursor()
    name = os.path.splitext(name)[0]  # 파일 이름에서 확장자 제거
    if name.startswith('(') and ')' in name:
                name = name.split(')', 1)[1].strip()  # 특수문자 처리
    sql_select = "SELECT * FROM addtable WHERE fileName = %s AND type = 'image'"
    cur.execute(sql_select, (name,))
    rows = cur.fetchall()

    if rows:
        sql_update = "UPDATE addtable SET placeText = %s WHERE fileName = %s AND type = 'image'"
        cur.execute(sql_update, (place_text, name))  # placeText 업데이트
    else:
        sql_insert = "INSERT INTO addtable (fileName, placeText, type) VALUES (%s, %s, 'image')"
        cur.execute(sql_insert, (name, place_text))  # 새로운 행 삽입
    
    conn.commit()  # 변경사항 커밋
    conn.close()  # 데이터베이스 연결 종료