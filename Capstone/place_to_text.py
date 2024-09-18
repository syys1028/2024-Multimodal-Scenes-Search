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

# �� ���� �ð��� ��:��:�� �������� ��ȯ�ϴ� �Լ�
def seconds_to_hhmmss(seconds):
    seconds = int(seconds)
    hours = seconds // 3600  # �ð� ���
    minutes = (seconds % 3600) // 60  # �� ���
    seconds = seconds % 60  # �� ���
    time_str = f"{hours:02}:{minutes:02}:{seconds:02}"  # ��:��:�� ������ ���ڿ� ��ȯ
    return time_str

# �����ͺ��̽����� Ư�� Ÿ�ӽ������� �˻��ϰ� ������Ʈ�ϴ� �Լ�
def search_db_timestamp(name, time, place_text):
    conn = db_connect.dbconnect()  # �����ͺ��̽� ����
    cur = conn.cursor()

    time_str = seconds_to_hhmmss(time)  # �ʸ� ��:��:�ʷ� ��ȯ

    sql_select = "SELECT timeStamp FROM datatable WHERE movieName = %s AND timeStamp = %s"
    cur.execute(sql_select, (name, time_str))  # Ÿ�ӽ����� �˻�
    rows = cur.fetchall()

    if rows:
        first_timestamp = rows[0][0]
        sql_update = "UPDATE datatable SET placeText = %s WHERE movieName = %s AND timeStamp = %s"
        cur.execute(sql_update, (place_text, name, first_timestamp))  # placeText ������Ʈ
    
    conn.commit()  # ������� Ŀ��
    conn.close()  # �����ͺ��̽� ���� ����

# ���� �̸��� �������� �Լ�
def get_file_name(name):
    path = "C:/Users/UBIT/frame/" + name + "/"  # ���� ��� ����
    file_list = os.listdir(path)  # ���� �� ���� ��� ��������
    file_list_img = [file for file in file_list if file.endswith('.png')]  # PNG ���ϸ� ���͸�
    file_name = [int(file.split('.')[0]) for file in file_list_img]  # ���� �̸����� ���� �κ� ����
    file_list_img = [f"{fname}.png" for fname in sorted(file_name)]  # ���ĵ� ���� �̸� ����Ʈ ����
    return path, file_name, file_list_img

# Places365 ���� �����ϰ� �ҷ����� �Լ�
def places365_model():
    arch = 'resnet50'  # �� ��Ű��ó ����
    model_file = 'resnet50_places365.pth.tar'  # �� ���� �̸�
    
    if not os.path.exists(model_file):  # �� ������ ������ �ٿ�ε�
        weight_url = 'http://places2.csail.mit.edu/models_places365/resnet50_places365.pth.tar'
        os.system('wget ' + weight_url + ' -O ' + model_file)
    
    model = models.__dict__[arch](num_classes=365)  # �� �ʱ�ȭ
    checkpoint = torch.load(model_file, map_location=lambda storage, loc: storage)  # �� üũ����Ʈ �ε�
    state_dict = {str.replace(k, 'module.', ''): v for k, v in checkpoint['state_dict'].items()}  # ���� ��ųʸ� ����
    model.load_state_dict(state_dict)  # �� ���� �ε�
    model.eval()  # �� �� ��� ����
    
    centre_crop = trn.Compose([
        trn.Resize((256, 256)),  # ũ�� ����
        trn.CenterCrop(224),  # �߾� �ڸ���
        trn.ToTensor(),  # �ټ��� ��ȯ
        trn.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])  # ����ȭ
    ])
    
    file_name = 'categories_places365.txt'  # ī�װ� ���� �̸�
    if not os.path.exists(file_name):  # ī�װ� ������ ������ �ٿ�ε�
        synset_url = 'https://raw.githubusercontent.com/csailvision/places365/master/categories_places365.txt'
        os.system('wget ' + synset_url + ' -O ' + file_name)
    
    classes = list()
    with open(file_name) as class_file:
        for line in class_file:
            classes.append(line.strip().split(' ')[0][3:])  # ī�װ� �̸� ����
    classes = tuple(classes)  # Ʃ�÷� ��ȯ
    
    return model, centre_crop, classes

# ī�װ� ������ �����ϴ� �Լ�
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
            fine_to_broad[fine] = broad  # ���� ī�װ��� ������ ī�װ��� ����
            
    return category_mapping, fine_to_broad

# �̹����� ó���ϴ� �Լ�
def process_image(img_cv2, centre_crop):
    img = Image.fromarray(cv2.cvtColor(img_cv2, cv2.COLOR_BGR2RGB))  # OpenCV �̹����� PIL �̹����� ��ȯ
    input_img = V(centre_crop(img).unsqueeze(0))  # �̹����� �� �Է� �������� ��ȯ
    return input_img

# ����� �з��ϴ� �Լ�
def classify_scene(model, input_img, classes, fine_to_broad, category_mapping):
    with torch.no_grad():
        logit = model(input_img)  # �� �߷�
    h_x = F.softmax(logit, dim=1).squeeze()  # ����Ʈ�ƽ� ����
    probs, idx = h_x.sort(0, True)  # Ȯ���� ������������ ����

    broad_category_probs = {broad: 0.0 for broad in category_mapping.keys()}  # ������ ī�װ� Ȯ�� �ʱ�ȭ
    subcategory_probs = {broad: [] for broad in category_mapping.keys()}  # ���� ī�װ� Ȯ�� �ʱ�ȭ
    
    for j in range(len(classes)):
        fine_category = classes[idx[j]]  # ���� ī�װ� �̸�
        broad_category = fine_to_broad.get(fine_category, "Unknown")  # ���� ī�װ��� ������ ī�װ��� ��ȯ
        if broad_category != "Unknown":
            broad_category_probs[broad_category] += probs[j].item()  # ������ ī�װ� Ȯ�� ����
            subcategory_probs[broad_category].append((fine_category, probs[j].item()))  # ���� ī�װ� Ȯ�� �߰�

    return broad_category_probs, subcategory_probs

# ���� ������ �̹������� ��� �ؽ�Ʈ�� �����ϴ� �Լ�
def place_to_text_model(name):
    model, centre_crop, classes = places365_model()  # �� �ʱ�ȭ
    category_mapping, fine_to_broad = get_category_mapping()  # ī�װ� ���� ����
    path, file_name, file_list_img = get_file_name(name)  # ���� �̸� �� ��� ��������
    
    count = 0
    last_category = None
    scene_counter = 0
    smoothing_window = []
    window_size = 5
    confidence_threshold = 0.01  

    for img_file in file_list_img:
        img_cv2 = cv2.imread(path + img_file)  # �̹��� �б�
        input_img = process_image(img_cv2, centre_crop)  # �̹��� ó��
        broad_category_probs, subcategory_probs = classify_scene(model, input_img, classes, fine_to_broad, category_mapping)  # ��� �з�

        smoothing_window.append(broad_category_probs)
        if len(smoothing_window) > window_size:
            smoothing_window.pop(0)  # ��Ȱȭ â ����

        avg_broad_category_probs = {broad: np.mean([frame[broad] for frame in smoothing_window]) for broad in category_mapping.keys()}  # ��� Ȯ�� ���
        sorted_broad_categories = sorted(avg_broad_category_probs.items(), key=lambda x: x[1], reverse=True)  # Ȯ�� �������� ����
        most_probable_category, most_probable_prob = sorted_broad_categories[0]

        # plt.figure(figsize=(8, 8))  # ���ο� �׸� ����
        # plt.imshow(cv2.cvtColor(img_cv2, cv2.COLOR_BGR2RGB))  # �̹��� ǥ��
        # plt.axis('off')  # �� ���� ����
        # plt.show(block=False)
        # plt.pause(5)  # 5�� ���
        # plt.close()

        print(f"Scene {count + 1}: {img_file}")
        print(f'{most_probable_prob:.3f} -> {most_probable_category}')
        subcategories = sorted(subcategory_probs[most_probable_category], key=lambda x: x[1], reverse=True)  # ���� ī�װ� Ȯ�� �������� ����
        for subcategory, sub_prob in subcategories:
            print(f'    {sub_prob:.3f} -> {subcategory}')

        if most_probable_prob > confidence_threshold:  # Ȯ���� �Ӱ谪���� ū ���
            if subcategories and subcategories[0][1] > 0:
                place_text = f"{most_probable_category} / {subcategories[0][0]}"  # ���� ī�װ� ���� �ؽ�Ʈ ����
            else:
                place_text = f"{most_probable_category} /"  # ���� ī�װ� ���� ���
            search_db_timestamp(name, int(img_file.split('.')[0]), place_text)  # Ÿ�ӽ����� �˻� �� ������Ʈ
        
        count += 1
        print('\n')

# ���� �̹������� ��� �ؽ�Ʈ�� �����ϴ� �Լ�
def process_single_image(name, image_path):
    confidence_threshold = 0.01
    model, centre_crop, classes = places365_model()  # �� �ʱ�ȭ
    category_mapping, fine_to_broad = get_category_mapping()  # ī�װ� ���� ����

    img_cv2 = cv2.imread(image_path)  # �̹��� �б�
    input_img = process_image(img_cv2, centre_crop)  # �̹��� ó��
    broad_category_probs, subcategory_probs = classify_scene(model, input_img, classes, fine_to_broad, category_mapping)  # ��� �з�

    sorted_broad_categories = sorted(broad_category_probs.items(), key=lambda x: x[1], reverse=True)  # Ȯ�� �������� ����
    most_probable_category, most_probable_prob = sorted_broad_categories[0]

    plt.figure(figsize=(8, 8))  # ���ο� �׸� ����
    plt.imshow(cv2.cvtColor(img_cv2, cv2.COLOR_BGR2RGB))  # �̹��� ǥ��
    plt.axis('off')  # �� ���� ����
    plt.show(block=False)
    plt.pause(0.5)  # 0.5�� ���
    plt.close()

    print(f'{most_probable_prob:.3f} -> {most_probable_category}')
    subcategories = sorted(subcategory_probs[most_probable_category], key=lambda x: x[1], reverse=True)  # ���� ī�װ� Ȯ�� �������� ����
    for subcategory, sub_prob in subcategories:
        print(f'    {sub_prob:.3f} -> {subcategory}')

    if most_probable_prob > confidence_threshold:  # Ȯ���� �Ӱ谪���� ū ���
        if subcategories and subcategories[0][1] > 0:
            place_text = f"{most_probable_category} / {subcategories[0][0]}"  # ���� ī�װ� ���� �ؽ�Ʈ ����
        else:
            place_text = f"{most_probable_category} /"  # ���� ī�װ� ���� ���
        update_addtable(name, place_text)  # �߰� ���̺� ������Ʈ

# ���� �̹����� OCR ����� �����ͺ��̽��� �����ϴ� �Լ�
def update_addtable(name, place_text):
    conn = db_connect.dbconnect()  # �����ͺ��̽� ����
    cur = conn.cursor()
    name = os.path.splitext(name)[0]  # ���� �̸����� Ȯ���� ����
    if name.startswith('(') and ')' in name:
                name = name.split(')', 1)[1].strip()  # Ư������ ó��
    sql_select = "SELECT * FROM addtable WHERE fileName = %s AND type = 'image'"
    cur.execute(sql_select, (name,))
    rows = cur.fetchall()

    if rows:
        sql_update = "UPDATE addtable SET placeText = %s WHERE fileName = %s AND type = 'image'"
        cur.execute(sql_update, (place_text, name))  # placeText ������Ʈ
    else:
        sql_insert = "INSERT INTO addtable (fileName, placeText, type) VALUES (%s, %s, 'image')"
        cur.execute(sql_insert, (name, place_text))  # ���ο� �� ����
    
    conn.commit()  # ������� Ŀ��
    conn.close()  # �����ͺ��̽� ���� ����