document.addEventListener('DOMContentLoaded', function () {
  const items = [
    {
      id: '0',
      element: document.getElementById('item-1'),
    },
    {
      id: '1',
      element: document.getElementById('item-2'),
    },
    {
      id: '2',
      element: document.getElementById('item-3'),
    },
    {
      id: '3',
      element: document.getElementById('item-4'),
    },
    {
      id: '4',
      element: document.getElementById('item-5'),
    },
    {
      id: '5',
      element: document.getElementById('item-6'),
    },
    {
      id: '6',
      element: document.getElementById('item-7'),
    },
  ];

  const indicators = document.querySelectorAll('.indicator');

  let currentArray = [0, 1, 2]; // Initial state
  const allArray = [0, 1, 2, 3, 4, 5, 6];

  function updateCarousel() {
    // 모든 아이템을 기본 상태로 초기화
    items.forEach((item) => {
      const h2Element = item.element.querySelector('h2');
      const pElement = item.element.querySelector('p');

      item.element.classList.remove('center-box');
      item.element.style.display = 'none'; // 모든 박스를 숨김
      item.element.style.transform = 'scale(1) translateX(0)'; // 크기 및 위치 기본값으로 설정
      item.element.style.zIndex = 1; // z-index를 기본으로 설정
      item.element.style.opacity = '0.7'; // 기본 투명도 설정
      item.element.style.filter = 'none'; // 기본 필터 설정
      item.element.style.boxShadow = 'none'; // 기본 그림자 제거
      item.element.style.order = ''; // Reset order

      // z-index가 1인 경우 h2 크기 설정
      h2Element.style.width = '158.14px';
      h2Element.style.height = '51.33px';
      h2Element.style.margin = '0 auto'; // 가운데 정렬 유지

      // p 요소 위치를 기본으로 맞추기
      pElement.style.marginTop = '20px';
    });

    // 현재 인덱스 기준으로 순환하여 중앙, 이전, 다음 아이템 결정
    const prevIndex = currentArray[0];
    const centerIndex = currentArray[1];
    const nextIndex = currentArray[2];

    // 이전, 중앙, 다음 박스 표시
    items[prevIndex].element.style.display = 'flex';
    items[prevIndex].element.style.order = 1;
    items[prevIndex].element.style.transform = 'scale(1) translateX(-50px)'; // 왼쪽으로 더 이동

    items[centerIndex].element.style.display = 'flex';
    items[centerIndex].element.style.transform = 'scale(1.3) translateX(0)'; // 중앙 요소의 크기를 더 키움, 가운데 위치
    items[centerIndex].element.style.zIndex = 10;
    items[centerIndex].element.style.opacity = '1'; // 중앙 요소의 투명도를 높임
    items[centerIndex].element.style.filter = 'brightness(1.2)'; // 중앙 요소의 밝기를 높임
    items[centerIndex].element.style.boxShadow =
      '0px 4px 20px rgba(0, 0, 0, 0.3)'; // 중앙 요소에 그림자 추가
    items[centerIndex].element.style.borderRadius = '15px'; // 중앙 요소에 border-radius 추가
    items[centerIndex].element.style.order = 2;

    // z-index가 10인 경우 h2 크기 설정
    const centerH2Element = items[centerIndex].element.querySelector('h2');
    const centerPElement = items[centerIndex].element.querySelector('p');

    centerH2Element.style.width = '181.86px';
    centerH2Element.style.height = '59.03px';
    centerH2Element.style.margin = '0 auto'; // 가운데 정렬 유지

    // p 요소 위치를 조정하여 중앙 정렬을 유지
    centerPElement.style.marginTop = '30px'; // 필요에 따라 값 조정
    centerPElement.style.fontWeight = 'bold'; // p 태그의 텍스트를 굵게 설정

    items[nextIndex].element.style.display = 'flex';
    items[nextIndex].element.style.order = 3;
    items[nextIndex].element.style.transform = 'scale(1) translateX(50px)'; // 오른쪽으로 더 이동

    // 인디케이터 업데이트
    indicators.forEach((indicator, index) => {
      indicator.classList.toggle('active', index === currentArray[0]);
    });
  }

  function animateSlide(direction) {
    if (direction === 'next') {
      currentArray = currentArray.map((index) => (index + 1) % allArray.length);
    } else if (direction === 'prev') {
      currentArray = currentArray.map(
        (index) => (index - 1 + allArray.length) % allArray.length
      );
    }
    updateCarousel();
  }

  document.getElementById('nextBtn').addEventListener('click', function () {
    animateSlide('next');
  });

  document.getElementById('prevBtn').addEventListener('click', function () {
    animateSlide('prev');
  });

  updateCarousel(); // 초기화
});
