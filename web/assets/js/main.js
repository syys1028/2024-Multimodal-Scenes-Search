document.addEventListener('DOMContentLoaded', function() {
	const inputQ1 = document.getElementById("Q1_1");
    const checkboxQ1 = document.getElementById("Q1_2");
	const selectQ3 = document.getElementById('Q3_1');
	const checkboxQ3 = document.getElementById("Q3_2");
	const checkboxesQ4_1 = document.getElementsByName("Q4_1");
	const checkboxesQ4_2 = document.getElementsByName("Q4_2");
    const inputQ4_3 = document.getElementById("Q4_3_1");
    const checkboxQ4_3 = document.getElementById("Q4_3_2");
    const selectQ5_1 = document.getElementById("Q5_1");
    const selectQ5_2 = document.getElementById("subOptions");
    const checkboxQ5 = document.getElementById("Q5_2");
    
    const currentPath = window.location.pathname.split("/").pop();
    const menuItems = document.querySelectorAll('#nav a');
    menuItems.forEach(item => {
        if(item.getAttribute('href') === currentPath) {
            item.classList.add('active');
            if(item.closest('.dropdown-content')) {
                item.closest('.dropdown').querySelector('.dropbtn').classList.add('active');
            }
        }
    });

    // 체크박스 중 하나만 선택하도록 하는 함수
    function checkOnlyOne(element, checkNum) {
        if (checkNum === 1) {
            checkboxesQ4_1.forEach((cb) => {
                if (cb !== element) cb.checked = false;
            });
        } else if (checkNum === 2) {
            checkboxesQ4_2.forEach((cb) => {
                if (cb !== element) cb.checked = false;
            });
        }
    }

    // 체크박스 Q1의 상태에 따라 텍스트 입력을 활성화/비활성화하는 함수
    function toggleTextInput() {
        if (checkboxQ1.checked) {
            inputQ1.style.backgroundColor = "#E2E2E2"; // 배경색 회색으로 변경
            inputQ1.disabled = true; // 입력 비활성화
        } else {
            inputQ1.style.backgroundColor = "white"; // 배경색 흰색으로 변경
            inputQ1.disabled = false; // 입력 활성화
        }
    }

    // 체크박스 Q3의 상태에 따라 선택 박스를 활성화/비활성화하는 함수
    function toggleTitleSelect() {
        if (checkboxQ3.checked) {
            selectQ3.style.backgroundColor = "#E2E2E2"; // 배경색 회색으로 변경
            selectQ3.disabled = true; // 선택 박스 비활성화
        } else {
            selectQ3.style.backgroundColor = "white"; // 배경색 흰색으로 변경
            selectQ3.disabled = false; // 선택 박스 활성화
        }
    }

    // 체크박스 Q4_3의 상태에 따라 입력 요소와 체크박스들을 활성화/비활성화하는 함수
    function toggleActorInput() {
        if (checkboxQ4_3.checked) {
            inputQ4_3.style.backgroundColor = "#E2E2E2"; // 배경색 회색으로 변경
            inputQ4_3.disabled = true; // 입력 비활성화

            checkboxesQ4_1.forEach((checkbox) => {
                checkbox.checked = false; // 체크박스 선택 해제
                checkbox.disabled = true; // 체크박스 비활성화
            });

            checkboxesQ4_2.forEach((checkbox) => {
                checkbox.checked = false; 
                checkbox.disabled = true; 
            });
        } else {
            inputQ4_3.style.backgroundColor = "white"; // 배경색 흰색으로 변경
            inputQ4_3.disabled = false; // 입력 활성화

            checkboxesQ4_1.forEach((checkbox) => {
                checkbox.disabled = false; // 체크박스 활성화
            });

            checkboxesQ4_2.forEach((checkbox) => {
                checkbox.disabled = false; 
            });
        }
    }

    // 체크박스 Q5의 상태에 따라 선택 박스를 활성화/비활성화하는 함수
    function togglePlaceSelect() {
        if (checkboxQ5.checked) {
            selectQ5_1.style.backgroundColor = "#E2E2E2"; // 배경색 회색으로 변경
            selectQ5_1.disabled = true; // 선택 박스 비활성화
            selectQ5_2.style.backgroundColor = "#E2E2E2"; 
            selectQ5_2.disabled = true; 
        } else {
            selectQ5_1.style.backgroundColor = "white"; // 배경색 흰색으로 변경
            selectQ5_1.disabled = false; // 선택 박스 활성화
            selectQ5_2.style.backgroundColor = "white";
            selectQ5_2.disabled = false; 
        }
    }

    // 이벤트 리스너 추가
    checkboxQ1.addEventListener('change', toggleTextInput); // Q1 체크박스 변경 이벤트
    checkboxQ3.addEventListener('change', toggleTitleSelect); // Q3 체크박스 변경 이벤트
    checkboxesQ4_1.forEach((checkbox) => {
        checkbox.addEventListener('change', function() { checkOnlyOne(this, 1); }); // Q4_1 체크박스 변경 이벤트
    });

    checkboxesQ4_2.forEach((checkbox) => {
        checkbox.addEventListener('change', function() { checkOnlyOne(this, 2); }); // Q4_2 체크박스 변경 이벤트
    });
    checkboxQ4_3.addEventListener('change', toggleActorInput); // Q4_3 체크박스 변경 이벤트
    checkboxQ5.addEventListener('change', togglePlaceSelect); // Q5 체크박스 변경 이벤트

});

$(document).ready(function() {
    $('#uploadForm').on('submit', function() {
        $('#uploadButton').text('Loading...').prop('disabled', true);
    });
});

// 웹 페이지 동작 함수
(function($) {

    var $window = $(window),
        $body = $('body');

    // Breakpoints.
    breakpoints({
        xlarge: ['1281px', '1680px'],
        large: ['981px', '1280px'],
        medium: ['737px', '980px'],
        small: [null, '736px']
    });

    // Play initial animations on page load.
    $window.on('load', function() {
        window.setTimeout(function() {
            $body.removeClass('is-preload');
        }, 100);
    });

    // Dropdowns.
    $('#nav > ul').dropotron({
        mode: 'fade',
        noOpenerFade: true,
        alignment: 'center'
    });

    // Nav.

    // Title Bar.
    $(
        '<div id="titleBar">' +
        '<a href="#navPanel" class="toggle"></a>' +
        '</div>'
    )
        .appendTo($body);

    // Panel.
    $(
        '<div id="navPanel">' +
        '<nav>' +
        $('#nav').navList() +
        '</nav>' +
        '</div>'
    )
        .appendTo($body)
        .panel({
            delay: 500,
            hideOnClick: true,
            hideOnSwipe: true,
            resetScroll: true,
            resetForms: true,
            side: 'left',
            target: $body,
            visibleClass: 'navPanel-visible'
        });

})(jQuery);

// 서브 옵션 표시 함수
function showSubOptions(value) {
    var subOptions = document.getElementById("subOptions"); // 서브 옵션 요소 가져오기
    subOptions.style.display = "none"; // 서브 옵션 숨기기

    // 서브 옵션 초기화
    subOptions.innerHTML = '<option value="" selected disabled>Select a detailed place</option>';

    // 선택한 옵션에 따라 서브 옵션 추가
    switch (value) {
        case "education":
            subOptions.innerHTML += `
                <option value="classroom">classroom</option>
                <option value="laboratory">laboratory</option>
                <option value="library">library</option>`;
            break;
        case "restaurant":
            subOptions.innerHTML += `
                <option value="bar">bar</option>
                <option value="food_court">food_court</option>
                <option value="restaurant">restaurant</option>`;
            break;
        case "nature":
            subOptions.innerHTML += `
                <option value="sea">sea</option>
                <option value="canyon">canyon</option>
                <option value="river">river</option>
                <option value="forest">forest</option>`;
            break;
        case "artificial":
            subOptions.innerHTML += `
                <option value="balcony">balcony</option>
                <option value="fountain">fountain</option>
                <option value="pavilion">pavilion</option>
                <option value="orchard">orchard</option>
                <option value="yard">yard</option>`;
            break;
        case "residence":
            subOptions.innerHTML += `
                <option value="kitchen">kitchen</option>
                <option value="living_room">living_room</option>
                <option value="study">study</option>
                <option value="balcony">balcony</option>
                <option value="bedroom">bedroom</option>`;
            break;
        case "accommodation":
            subOptions.innerHTML += `
                <option value="hotel_room">hotel_room</option>
                <option value="camping_site">camping_site</option>`;
            break;
        case "religious_medical":
            subOptions.innerHTML += `
                <option value="hospital">hospital</option>
                <option value="health_center">health_center</option>
                <option value="church">church</option>
                <option value="temple">temple</option>`;
            break;
        case "public":
            subOptions.innerHTML += `
                <option value="government_office">government_office</option>
                <option value="bank">bank</option>
                <option value="park">park</option>`;
            break;
        case "transportation":
            subOptions.innerHTML += `
                <option value="taxi">taxi</option>
                <option value="train">train</option>
                <option value="car">car</option>
                <option value="airplane">airplane</option>`;
            break;
        case "commercial":
            subOptions.innerHTML += `
                <option value="market">market</option>
                <option value="supermarket">supermarket</option>
                <option value="shopping_mall">shopping_mall</option>`;
            break;
        case "cultural_heritage":
            subOptions.innerHTML += `
                <option value="museum">museum</option>
                <option value="historical_site">historical_site</option>`;
            break;
        case "sports_leisure":
            subOptions.innerHTML += `
                <option value="stadium">stadium</option>
                <option value="ice_rink">ice_rink</option>
                <option value="bowling_alley">bowling_alley</option>
                <option value="gym">gym</option>`;
            break;
        case "entertainment":
            subOptions.innerHTML += `
                <option value="arcade">arcade</option>
                <option value="pc_room">pc_room</option>
                <option value="amusement_park">amusement_park</option>`;
            break;
        case "performance":
            subOptions.innerHTML += `
                <option value="concert_hall">concert_hall</option>
                <option value="stage">stage</option>
                <option value="theater">theater</option>`;
            break;
        case "event_office":
            subOptions.innerHTML += `
                <option value="office">office</option>
                <option value="conference_room">conference_room</option>
                <option value="wedding_hall">wedding_hall</option>
                <option value="cafeteria">cafeteria</option>`;
            break;
        case "building_interior":
            subOptions.innerHTML += `
                <option value="corridor">corridor</option>
                <option value="stairs">stairs</option>
                <option value="elevator">elevator</option>`;
            break;
        case "urban_environment":
            subOptions.innerHTML += `
                <option value="urban_street">urban_street</option>
                <option value="building_forest">building_forest</option>`;
            break;
        case "road_transportation":
            subOptions.innerHTML += `
                <option value="overpass">overpass</option>
                <option value="bridge">bridge</option>
                <option value="crosswalk">crosswalk</option>`;
            break;
        case "art_exhibition":
            subOptions.innerHTML += `
                <option value="gallery">gallery</option>
                <option value="exhibition">exhibition</option>`;
            break;
        case "industrial":
            subOptions.innerHTML += `
                <option value="factory">factory</option>
                <option value="dam">dam</option>
                <option value="water_facility">water_facility</option>`;
            break;
        default:
            break;
    }

    // 선택한 옵션이 주요 옵션일 경우 서브 옵션 보이기
    if (subOptions.children.length > 1) {
        subOptions.style.display = "block";
    }
}