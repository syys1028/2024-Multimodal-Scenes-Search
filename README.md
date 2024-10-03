# 2024-Multimodal-Scenes-Search
💡 [ Protfolio Project 006] 멀티모달 장면 검색 시스템

## 📌 프로젝트 소개
![image](https://github.com/user-attachments/assets/35e499a4-45f2-49f2-bdd3-64d508d34234)  
>- [팀 프로젝트] 제 12회 sw 융합 해커톤 대회
>  
>- [기간] 2024. 08. 23 ~ 2024. 08. 25
>  
>- [역할] 팀장 / 백엔드 및 모듈 개발 담당  
  
이 프로젝트는 동영상의 특정 장면을 키워드로 쉽게 검색하고, 자막, 음성, 장소, 인물 정보를 인식하여 텍스트로 변환하고 데이터베이스에 저장하는 시스템입니다. 사용자는 웹을 통해 영화를 업로드하고, 키워드를 입력하여 장면을 검색하거나, 장면 정보를 다양한 언어로 번역해 다운로드할 수 있습니다. 이 시스템은 영화 속 장면을 쉽게 찾을 수 있어 사용자 경험을 극대화하며, OTT, 방송사 등 다양한 분야에서 활용될 수 있습니다.

![image](https://github.com/user-attachments/assets/a94daa70-973b-49c5-8fab-969216735140)

## 📌 폴더 구조
    📂 2024-Multimodal-Scenes-Search/  
    ┣ 📂 Capstone/                      # Python 모듈  
    ┃ ┣ 📜 add_upload_all.py                # 추가 업로드 데이터 처리 모듈  
    ┃ ┣ 📜 db_connect.py                    # MySQL 데이터베이스 연결 모듈  
    ┃ ┣ 🔎 final_movie_search_py.py         # 최종 영화 검색 기능 모듈  
    ┃ ┣ 📜 image_to_text.py                 # OCR로 이미지에서 텍스트 추출  
    ┃ ┣ 📜 mov_to_Img.py                    # 영화 비디오에서 프레임을 추출해 이미지로 변환  
    ┃ ┣ 📜 mp3_to_text.py                   # Whisper로 음성 파일을 텍스트로 변환  
    ┃ ┣ 📜 place_to_text.py                 # Place365 모델을 사용한 장소 인식  
    ┃ ┣ 📜 trans_to_text.py                 # 텍스트 데이터 번역 및 MySQL 저장  
    ┣ 📂 web/                       
    ┃ ┣ 📂 assets/                     
    ┃ ┃ ┣ 📂 js/                        # JavaScript 파일   
    ┃ ┃ ┃ ┣ 📜 intro.js                    # 소개 페이지 기능  
    ┃ ┃ ┃ ┣ 📜 main.js                     # 웹페이지 메인  
    ┃ ┃ ┃ ┣ 📜 upload.js                   # 파일 업로드 기능  
    ┃ ┣ 🔎 main_page.html               # 메인 페이지 html

## 📌 데이터베이스 구조
 - label: 라벨  
 - movieName: 영화 제목  
 - timeStamp: 타임스탬프  
 - subText: 자막  
 - voiceText: 음성  
 - placeText: 장소  
 - isMainActor: 주연 배우 여부  
 - actorName: 주연 배우 이름  
 - actorGender: 주연 배우 성별
   
![db](https://github.com/user-attachments/assets/a29ee678-4eb3-4c2b-b9bd-a0e9faf280c9)

## 📌 주요 기능
### - 영화 업로드 및 장면 분석:  
사용자는 영화를 웹 페이지를 통해 업로드할 수 있습니다. 업로드된 영화는 Python 모듈을 통해 자막, 음성, 장소, 인물 정보를 추출하여 텍스트로 변환한 후 MySQL 데이터베이스에 저장됩니다.

### - 장면 검색 및 타임스탬프 제공:  
사용자가 웹 페이지에서 키워드를 입력하면 해당 키워드와 일치하는 장면 정보를 데이터베이스에서 검색해 결과를 제공합니다. 타임스탬프를 제공하여 원하는 장면으로 바로 이동할 수 있습니다.

### - 자막, 음성, 장소 인식:
- 자막 : PaddleOCR를 사용해 이미지에서 자막을 추출합니다.  
- 음성 : Whisper 모델을 사용해 음성을 텍스트로 변환합니다.  
- 장소 : Place365의 사전학습된 CNN-ResNet50 모델을 사용해 장소를 인식하고 텍스트로 변환합니다.  

### - 다국어 번역 기능:
추출된 텍스트 데이터를 Google Cloud API를 이용해 다양한 언어로 번역하고, 번역된 텍스트 파일을 다운로드할 수 있습니다.  

### - 프레임 추출 및 삭제 기능:
업로드된 영화에서 프레임을 36프레임당 1장씩 추출해 처리하며, 처리 완료 후 서버에서 프레임 이미지를 삭제하여 저장 공간을 효율적으로 관리합니다.  

## 📌 구현 상세
### - 프레임 추출 및 데이터 분석
영화 비디오에서 프레임을 1.5초당 1장씩 추출해 이미지로 변환하고, 이미지 및 음성 데이터를 분석해 텍스트로 변환합니다.  

### - 텍스트 데이터 저장
분석된 텍스트 데이터를 MySQL 데이터베이스에 저장하여 키워드 검색에 활용됩니다.  

### - 장면 검색 및 번역
사용자가 입력한 키워드를  바탕으로 장면을 검색하고, 해당 타임스탬프의 영상을 재생할 수 있습니다.  
텍스트 데이터를 여러 언어로 번역하여 사용자가 다운로드할 수 있습니다.  


## 📌 개발 환경
### - 언어 및 프레임워크
- Python : 모듈 개발 및 데이터 처리
- Node.js & Express : 서버 및 API
- HTML, CSS, JavaScript : 웹 프론트엔드 개발

### - 데이터 처리 및 DB
- MySQL : 데이터베이스 사용
- PaddleOCR : 자막 인식
- Whisper : 음성 인식
- Place365 (ResNet50) : 장소 인식
- Google Cloud API : 번역 및 Speech-to-Text

### - 개발 도구
- Jupyter Notebook : Python 모듈 개발
- VSCode : 웹 및 서버 개발
- PHP : 파일 처리 및 서버 간 연결
 
