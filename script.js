// Firebase 설정 (compat 버전 사용)
const firebaseConfig = {
  apiKey: "AIzaSyDxWBKeHE34yLJXLZv-3zfOkRYNYiPaW1c",
  authDomain: "website-5e2c9.firebaseapp.com",
  projectId: "website-5e2c9",
  storageBucket: "website-5e2c9.firebasestorage.app",
  messagingSenderId: "847820631817",
  appId: "1:847820631817:web:122684e421d31bb8d72dd8",
  databaseURL: "https://website-5e2c9-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Firebase 초기화 (compat 버전)
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const storage = firebase.storage();

// Storage 참조 설정 (CORS 문제 해결을 위한 추가 설정)
const storageRef = storage.ref();
storage.maxOperationRetryTime = 30000; // 30초 재시도
storage.maxUploadRetryTime = 30000;

// 전역 변수들
let schedules = [];
let budgets = [];
let memos = [];

// 원형 워크플로우 데이터 구조
let circularWorkflow = [
    { id: 1, name: "샤시", icon: "window-maximize", status: "pending", progress: 0, details: "", contractors: [], images: [] },
    { id: 2, name: "전기", icon: "bolt", status: "pending", progress: 0, details: "", contractors: [], images: [] },
    { id: 3, name: "문", icon: "door-closed", status: "pending", progress: 0, details: "", contractors: [], images: [] },
    { id: 4, name: "바닥 수평", icon: "ruler-horizontal", status: "pending", progress: 0, details: "", contractors: [], images: [] },
    { id: 5, name: "목공", icon: "hammer", status: "pending", progress: 0, details: "", contractors: [], images: [] },
    { id: 6, name: "타일", icon: "border-all", status: "pending", progress: 0, details: "", contractors: [], images: [] },
    { id: 7, name: "벽지+바닥", icon: "paint-roller", status: "pending", progress: 0, details: "", contractors: [], images: [] },
    { id: 8, name: "전기 마감", icon: "plug", status: "pending", progress: 0, details: "", contractors: [], images: [] },
    { id: 9, name: "입주청소", icon: "broom", status: "pending", progress: 0, details: "", contractors: [], images: [] }
];

// 기본 워크플로우 백업: Firebase 데이터 누락 시 병합/복구용
const defaultCircularWorkflow = JSON.parse(JSON.stringify(circularWorkflow));

// 워크플로우 이미지 필드 초기화 함수
function initializeWorkflowImages() {
    circularWorkflow.forEach(step => {
        if (!step.images) {
            step.images = [];
        }
    });

}

let currentEditingWorkflowStep = null;
let currentView = 'calendar';
let currentDate = new Date();
let currentEditingId = null;
let currentEditingType = null;
let selectedSchedule = null;

// 로컬스토리지 키
const STORAGE_KEYS = {
    schedules: 'interior_schedules',
    budgets: 'interior_budgets',
    workflows: 'interior_workflows',
    memos: 'interior_memos',
    circularWorkflow: 'interior_circular_workflow'
};

// DOM 요소들
const elements = {
    // 탭 관련
    tabButtons: document.querySelectorAll('.tab-btn'),
    contentSections: document.querySelectorAll('.content-section'),
    
    // 검색 관련
    globalSearch: document.getElementById('globalSearch'),
    clearSearch: document.getElementById('clearSearch'),
    scheduleSearch: document.getElementById('scheduleSearch'),
    budgetSearch: document.getElementById('budgetSearch'),
    memoSearch: document.getElementById('memoSearch'),
    
    // 필터 관련
    scheduleStatusFilter: document.getElementById('scheduleStatusFilter'),
    budgetSortFilter: document.getElementById('budgetSortFilter'),
    memoSortFilter: document.getElementById('memoSortFilter'),
    
    // 카운트 관련
    scheduleCount: document.getElementById('scheduleCount'),
    budgetCount: document.getElementById('budgetCount'),
    memoCount: document.getElementById('memoCount'),
    
    // 스케줄 관련
    addScheduleBtn: document.getElementById('addScheduleBtn'),
    scheduleModal: document.getElementById('scheduleModal'),
    scheduleForm: document.getElementById('scheduleForm'),
    scheduleList: document.getElementById('scheduleList'),
    closeScheduleModal: document.getElementById('closeScheduleModal'),
    cancelSchedule: document.getElementById('cancelSchedule'),
    
    // 캘린더 관련
    calendarViewBtn: document.getElementById('calendarViewBtn'),
    listViewBtn: document.getElementById('listViewBtn'),
    calendarContainer: document.getElementById('calendarContainer'),
    scheduleContainer: document.getElementById('scheduleContainer'),
    prevMonth: document.getElementById('prevMonth'),
    nextMonth: document.getElementById('nextMonth'),
    calendarTitle: document.getElementById('calendarTitle'),
    calendarGrid: document.getElementById('calendarGrid'),
    
    // 일정 상세보기 관련
    scheduleDetailModal: document.getElementById('scheduleDetailModal'),
    closeScheduleDetailModal: document.getElementById('closeScheduleDetailModal'),
    detailTitle: document.getElementById('detailTitle'),
    detailPeriod: document.getElementById('detailPeriod'),
    detailDuration: document.getElementById('detailDuration'),
    detailDescription: document.getElementById('detailDescription'),
    editFromDetail: document.getElementById('editFromDetail'),
    deleteFromDetail: document.getElementById('deleteFromDetail'),
    
    // 예산 관련
    addBudgetBtn: document.getElementById('addBudgetBtn'),
    budgetModal: document.getElementById('budgetModal'),
    budgetForm: document.getElementById('budgetForm'),
    budgetList: document.getElementById('budgetList'),
    closeBudgetModal: document.getElementById('closeBudgetModal'),
    cancelBudget: document.getElementById('cancelBudget'),
    totalBudget: document.getElementById('totalBudget'),
    usedBudget: document.getElementById('usedBudget'),
    remainingBudget: document.getElementById('remainingBudget'),
    
    // 워크플로우 관련
    addWorkflowBtn: document.getElementById('addWorkflowBtn'),
    workflowModal: document.getElementById('workflowModal'),
    workflowForm: document.getElementById('workflowForm'),
    workflowSteps: document.getElementById('workflowSteps'),
    closeWorkflowModal: document.getElementById('closeWorkflowModal'),
    cancelWorkflow: document.getElementById('cancelWorkflow'),
    
    // 메모 관련
    addMemoBtn: document.getElementById('addMemoBtn'),
    memoModal: document.getElementById('memoModal'),
    memoForm: document.getElementById('memoForm'),
    memoList: document.getElementById('memoList'),
    closeMemoModal: document.getElementById('closeMemoModal'),
    cancelMemo: document.getElementById('cancelMemo'),
    detailEditTitle: document.getElementById('detailEditTitle'),
    detailEditStartDate: document.getElementById('detailEditStartDate'),
    detailEditEndDate: document.getElementById('detailEditEndDate'),
    detailEditStatus: document.getElementById('detailEditStatus'),
    detailEditDescription: document.getElementById('detailEditDescription')
};

// 검색 및 필터 상태
let searchFilters = {
    global: '',
    schedule: {
        text: '',
        status: ''
    },
    workflow: '',
    budget: {
        text: '',
        sort: 'name'
    },
    memo: {
        text: '',
        sort: 'date'
    }
};

// 초기화 함수
function init() {
    try {
        // Firebase 초기화 및 연결 확인
        if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
            database = firebase.database();
        }
        
        // 연결 상태 확인
        checkFirebaseConnection();
        
        // 데이터 로드
        loadSchedulesFromFirebase();
        loadBudgetsFromFirebase();
        loadMemosFromFirebase();
        loadImportantFromFirebase();
        loadWorkflowFromFirebase();
        
        // 이벤트 리스너 설정
        setupEventListeners();
        
        // 초기 렌더링
        renderAll();
        
        // 워크플로우 이미지 초기화
        initializeWorkflowImages();
        
        // 사용자 정의 확인 모달 설정
        setupCustomConfirmModal();
        
    } catch (error) {
        console.error('Firebase 초기화 오류:', error);
        showNotification('Firebase 연결에 실패했습니다. 페이지를 새로고침해주세요.', 'error');
    }
}

// 사용자 정의 확인 모달 함수
function customConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const messageElement = document.getElementById('confirmMessage');
        const confirmBtn = document.getElementById('confirmOk');
        const cancelBtn = document.getElementById('confirmCancel');
        
        // 요소가 존재하지 않으면 기본 confirm 사용
        if (!modal || !messageElement || !confirmBtn || !cancelBtn) {
            console.warn('confirmModal 요소가 없습니다. 기본 confirm을 사용합니다.');
            resolve(confirm(message));
            return;
        }
        
        messageElement.textContent = message;
        modal.style.display = 'block';
        
        const handleConfirm = () => {
            modal.style.display = 'none';
            cleanup();
            resolve(true);
        };
        
        const handleCancel = () => {
            modal.style.display = 'none';
            cleanup();
            resolve(false);
        };
        
        const cleanup = () => {
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    });
}

// 사용자 정의 확인 모달 이벤트 설정
function setupCustomConfirmModal() {
    const modal = document.getElementById('confirmModal');
    
    if (!modal) {
        console.warn('confirmModal 요소가 없습니다.');
        return;
    }
    
    // 모달 외부 클릭 시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // ESC 키로 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    });
}

// Firebase에서 스케쥴 데이터 실시간 로드
function loadSchedulesFromFirebase() {
    const schedulesRef = database.ref('schedules');
    schedulesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        schedules = [];
        if (data) {
            Object.keys(data).forEach(key => {
                schedules.push({
                    id: key,
                    ...data[key]
                });
            });
        }
        renderSchedules();
    }, (error) => {
        console.error('스케쥴 데이터 로드 중 오류:', error);
        showNotification('스케쥴 데이터를 불러오는 중 오류가 발생했습니다.', 'error');
    });
}

// Firebase에 스케쥴 저장
async function saveScheduleToFirebase(scheduleData, scheduleId = null) {
    try {
        if (scheduleId) {
            // 기존 스케쥴 수정
            const scheduleRef = database.ref(`schedules/${scheduleId}`);
            await scheduleRef.set({
                title: scheduleData.title,
                startDate: scheduleData.startDate,
                endDate: scheduleData.endDate,
                status: scheduleData.status,
                description: scheduleData.description
            });
            showNotification('일정이 성공적으로 수정되었습니다.', 'success');
        } else {
            // 새 스케쥴 추가
            const schedulesRef = database.ref('schedules');
            await schedulesRef.push({
                title: scheduleData.title,
                startDate: scheduleData.startDate,
                endDate: scheduleData.endDate,
                status: scheduleData.status,
                description: scheduleData.description
            });
            showNotification('일정이 성공적으로 추가되었습니다.', 'success');
        }
    } catch (error) {
        console.error('스케쥴 저장 중 오류:', error);
        showNotification('일정 저장 중 오류가 발생했습니다.', 'error');
    }
}

// Firebase에서 스케쥴 삭제
async function deleteScheduleFromFirebase(scheduleId) {
    try {
        const scheduleRef = database.ref(`schedules/${scheduleId}`);
        await scheduleRef.remove();
        showNotification('일정이 성공적으로 삭제되었습니다.', 'success');
    } catch (error) {
        console.error('스케쥴 삭제 중 오류:', error);
        showNotification('일정 삭제 중 오류가 발생했습니다.', 'error');
    }
}

// Firebase에 워크플로우 저장
async function saveWorkflowToFirebase() {
    try {
        const workflowRef = database.ref('workflow');
        await workflowRef.set(circularWorkflow);
        showNotification('워크플로우가 Firebase에 저장되었습니다.', 'success');
        
        return true;
    } catch (error) {
        console.error('=== 워크플로우 Firebase 저장 중 오류 ===');
        console.error('오류 상세:', error);
        console.error('오류 스택:', error.stack);
        showNotification('워크플로우 저장 중 오류: ' + error.message, 'error');
        throw error;
    }
}

// Firebase에서 워크플로우 실시간 로드
function loadWorkflowFromFirebase() {
    const workflowRef = database.ref('workflow');
    workflowRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && Array.isArray(data)) {
            // Firebase 데이터 로드
            circularWorkflow = data;

            // 기본 단계와 병합 (누락 항목 및 필드 보완)
            defaultCircularWorkflow.forEach(defStep => {
                const found = circularWorkflow.find(s => s && s.id === defStep.id);
                if (!found) {
                    // 누락된 단계 추가
                    circularWorkflow.push({ ...defStep });
                } else {
                    // 필수 필드 누락 시 기본값으로 보완
                    ['name', 'icon', 'status', 'progress', 'details', 'contractors', 'images'].forEach(key => {
                        if (found[key] === undefined || found[key] === null) {
                            found[key] = Array.isArray(defStep[key]) ? [...defStep[key]] : defStep[key];
                        }
                    });
                }
            });

            // 이미지 필드 보장 및 정렬
            circularWorkflow.forEach(step => {
                if (!step.images) step.images = [];
            });
            circularWorkflow.sort((a, b) => a.id - b.id);
        } else {
            // Firebase 데이터가 없으면 기본 워크플로우 사용
            circularWorkflow = JSON.parse(JSON.stringify(defaultCircularWorkflow));
        }

        // UI 반영
        renderTimelineWorkflow();
        updateOverallProgress();
    }, (error) => {
        console.error('워크플로우 데이터 로드 중 오류:', error);
        // 오류 시에도 기본 워크플로우로 복구
        circularWorkflow = JSON.parse(JSON.stringify(defaultCircularWorkflow));
        renderTimelineWorkflow();
        updateOverallProgress();
    });
}

// Firebase에서 예산 데이터 실시간 로드
function loadBudgetsFromFirebase() {
    const budgetsRef = database.ref('budgets');
    budgetsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        budgets = [];
        if (data) {
            Object.keys(data).forEach(key => {
                budgets.push({
                    id: key,
                    ...data[key]
                });
            });
        }
        renderBudgets();
    }, (error) => {
        console.error('예산 데이터 로드 중 오류:', error);
        showNotification('예산 데이터를 불러오는 중 오류가 발생했습니다.', 'error');
    });
}

// Firebase에 예산 저장
async function saveBudgetToFirebase(budgetData, budgetId = null) {
    try {
        if (budgetId) {
            // 기존 예산 수정
            const budgetRef = database.ref(`budgets/${budgetId}`);
            await budgetRef.set({
                category: budgetData.category,
                estimated: budgetData.estimated,
                used: budgetData.used,
                note: budgetData.note
            });
            showNotification('예산이 성공적으로 수정되었습니다.', 'success');
        } else {
            // 새 예산 추가
            const budgetsRef = database.ref('budgets');
            await budgetsRef.push({
                category: budgetData.category,
                estimated: budgetData.estimated,
                used: budgetData.used,
                note: budgetData.note
            });
            showNotification('예산이 성공적으로 추가되었습니다.', 'success');
        }
    } catch (error) {
        console.error('예산 저장 중 오류:', error);
        showNotification('예산 저장 중 오류가 발생했습니다.', 'error');
    }
}

// Firebase에서 예산 삭제
async function deleteBudgetFromFirebase(budgetId) {
    try {
        const budgetRef = database.ref(`budgets/${budgetId}`);
        await budgetRef.remove();
        showNotification('예산이 성공적으로 삭제되었습니다.', 'success');
    } catch (error) {
        console.error('예산 삭제 중 오류:', error);
        showNotification('예산 삭제 중 오류가 발생했습니다.', 'error');
    }
}

// Firebase에서 메모 데이터 실시간 로드
function loadMemosFromFirebase() {
    const memosRef = database.ref('memos');
    memosRef.on('value', (snapshot) => {
        try {
            memos = [];
            snapshot.forEach(childSnapshot => {
                memos.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            renderMemos();
        } catch (error) {
            console.error('메모 데이터 로드 중 오류:', error);
            showNotification('메모 데이터를 불러오는 중 오류가 발생했습니다.', 'error');
        }
    });
}



// Firebase에 메모 저장
async function saveMemoToFirebase(memoData, memoId = null) {
    try {
        if (memoId) {
            // 기존 메모 수정
            const memoRef = database.ref(`memos/${memoId}`);
            await memoRef.set({
                title: memoData.title,
                content: memoData.content,
                completed: memoData.completed,
                createdAt: memoData.createdAt
            });
            showNotification('메모가 성공적으로 수정되었습니다.', 'success');
        } else {
            // 새 메모 추가
            const memosRef = database.ref('memos');
            await memosRef.push({
                title: memoData.title,
                content: memoData.content,
                completed: memoData.completed,
                createdAt: memoData.createdAt
            });
            showNotification('메모가 성공적으로 추가되었습니다.', 'success');
        }
    } catch (error) {
        console.error('메모 저장 중 오류:', error);
        showNotification('메모 저장 중 오류가 발생했습니다.', 'error');
    }
}

// Firebase에서 메모 삭제
async function deleteMemoFromFirebase(memoId) {
    try {
        const memoRef = database.ref(`memos/${memoId}`);
        await memoRef.remove();
        showNotification('메모가 성공적으로 삭제되었습니다.', 'success');
    } catch (error) {
        console.error('메모 삭제 중 오류:', error);
        showNotification('메모 삭제 중 오류가 발생했습니다.', 'error');
    }
}

// Firebase에서 메모 완료 상태 업데이트
async function updateMemoCompletedInFirebase(memoId, completed) {
    try {
        const memoRef = database.ref(`memos/${memoId}/completed`);
        await memoRef.set(completed);
    } catch (error) {
        console.error('메모 완료 상태 업데이트 중 오류:', error);
        showNotification('메모 상태 업데이트 중 오류가 발생했습니다.', 'error');
    }
}

// Firebase에서 중요사항 데이터 실시간 로드
function loadImportantFromFirebase() {
    const importantRef = database.ref('important');
    importantRef.on('value', async (snapshot) => {
        const data = snapshot.val();
        let importantItems = [];
        if (data) {
            Object.keys(data).forEach(key => {
                importantItems.push({
                    id: key,
                    ...data[key]
                });
            });
            renderImportantItems(importantItems);
        } else {
            // 기본 중요사항 데이터를 Firebase에 저장
            
            const defaultItems = [
                {
                    title: '시공 시 계약 확인',
                    content: '시공시 각각 문자로 최종계약내용 정리해서 보내고 확답받기',
                    icon: 'comment-dots'
                },
                {
                    title: '폐기물처리 및 철거비용 확인',
                    content: '각각 업체 계약할때 폐기물처리 + 철거비용 포함 되어있는지 확인',
                    icon: 'trash-alt'
                }
            ];
            
            try {
                // 기본 데이터를 Firebase에 저장
                for (const item of defaultItems) {
                    await importantRef.push(item);
                }
                
            } catch (error) {
                console.error('기본 중요사항 데이터 저장 중 오류:', error);
                // 저장 실패시 렌더링만 수행
                importantItems = defaultItems.map((item, index) => ({
                    id: `default${index + 1}`,
                    ...item
                }));
                renderImportantItems(importantItems);
            }
        }
    }, (error) => {
        console.error('중요사항 데이터 로드 중 오류:', error);
        showNotification('중요사항 데이터를 불러오는 중 오류가 발생했습니다.', 'error');
    });
}

// Firebase에 중요사항 저장
async function saveImportantToFirebase(importantData, importantId = null) {
    try {
        if (importantId) {
            // 기존 중요사항 수정
            const importantRef = database.ref(`important/${importantId}`);
            await importantRef.set({
                title: importantData.title,
                content: importantData.content,
                icon: importantData.icon
            });
            showNotification('중요사항이 성공적으로 수정되었습니다.', 'success');
        } else {
            // 새 중요사항 추가
            const importantRef = database.ref('important');
            await importantRef.push({
                title: importantData.title,
                content: importantData.content,
                icon: importantData.icon
            });
            showNotification('중요사항이 성공적으로 추가되었습니다.', 'success');
        }
    } catch (error) {
        console.error('중요사항 저장 중 오류:', error);
        showNotification('중요사항 저장 중 오류가 발생했습니다.', 'error');
    }
}

// Firebase에서 중요사항 삭제
async function deleteImportantFromFirebase(importantId) {
    try {
        const importantRef = database.ref(`important/${importantId}`);
        await importantRef.remove();
        showNotification('중요사항이 성공적으로 삭제되었습니다.', 'success');
    } catch (error) {
        console.error('중요사항 삭제 중 오류:', error);
        showNotification('중요사항 삭제 중 오류가 발생했습니다.', 'error');
    }
}

// 중요사항 렌더링 함수 (아코디언 형태)
function renderImportantItems(items) {
    const importantList = document.querySelector('.important-list');
    if (!importantList) return;
    
    importantList.innerHTML = '';
    
    items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'important-item';
        
        itemElement.innerHTML = `
            <div class="important-header" onclick="toggleImportantItem('${item.id}')">
                <div class="important-icon">
                    <i class="fas fa-${item.icon}"></i>
                </div>
                <div class="important-title-section">
                    <h4 class="important-title">${item.title}</h4>
                </div>
                <div class="important-expand-icon">
                    <i class="fas fa-chevron-down"></i>
                </div>
            </div>
            <div class="important-content" id="content-${item.id}">
                <div class="important-content-inner">
                    <p class="important-description">${item.content}</p>
                    <div class="important-actions">
                        <button class="btn-edit" onclick="openImportantModal('${item.id}', \`${item.title}\`, \`${item.content}\`, '${item.icon}')">
                            <i class="fas fa-edit"></i> 수정
                        </button>
                        <button class="btn-danger" onclick="deleteImportant('${item.id}')">
                            <i class="fas fa-trash"></i> 삭제
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        importantList.appendChild(itemElement);
    });
}

// 중요사항 모달 열기
function openImportantModal(id = null, title = '', content = '', icon = 'comment-dots') {
    currentEditingType = 'important';
    currentEditingId = id;
    
    // 스크롤 위치 기억 및 body 스크롤 방지
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollTop}px`;
    document.body.style.width = '100%';
    
    document.getElementById('importantTitle').value = title;
    document.getElementById('importantContent').value = content;
    document.getElementById('importantIcon').value = icon;
    
    document.getElementById('importantModal').style.display = 'block';
}

// 중요사항 모달 닫기
function closeImportantModal() {
    document.getElementById('importantModal').style.display = 'none';
    
    // body 스크롤 복원
    const scrollTop = Math.abs(parseInt(document.body.style.top || 0));
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    
    // 원래 스크롤 위치로 복원
    if (scrollTop > 0) {
        document.documentElement.scrollTop = scrollTop;
        document.body.scrollTop = scrollTop;
    }
    
    currentEditingId = null;
    currentEditingType = null;
}

// 중요사항 제출 처리
async function handleImportantSubmit(e) {
    e.preventDefault();
    
    const importantData = {
        title: document.getElementById('importantTitle').value,
        content: document.getElementById('importantContent').value,
        icon: document.getElementById('importantIcon').value
    };
    
    // Firebase에 저장
    await saveImportantToFirebase(importantData, currentEditingId);
    
    closeImportantModal();
}

// 중요사항 삭제
async function deleteImportant(id) {
    const confirmed = await customConfirm('정말로 이 중요사항을 삭제하시겠습니까?');
    if (confirmed) {
        // Firebase에서 삭제
        await deleteImportantFromFirebase(id);
    }
}

// 중요사항 아코디언 토글 함수
function toggleImportantItem(id) {
    const itemElement = document.getElementById(`content-${id}`).parentElement;
    const expandIcon = itemElement.querySelector('.important-expand-icon i');
    
    if (itemElement.classList.contains('expanded')) {
        // 닫기
        itemElement.classList.remove('expanded');
        expandIcon.classList.remove('fa-chevron-up');
        expandIcon.classList.add('fa-chevron-down');
    } else {
        // 열기
        itemElement.classList.add('expanded');
        expandIcon.classList.remove('fa-chevron-down');
        expandIcon.classList.add('fa-chevron-up');
    }
}

// Firebase 연결 상태 확인
function checkFirebaseConnection() {
    const connectedRef = database.ref('.info/connected');
    connectedRef.on('value', (snapshot) => {
        if (snapshot.val() === true) {
            // 연결 상태 표시 업데이트 (선택사항)
            const statusElement = document.querySelector('.connection-status');
            if (statusElement) {
                statusElement.style.display = 'none';
            }
        } else {
            showNotification('Firebase 연결이 끊어졌습니다. 메모 삭제 기능이 제한됩니다.', 'error');
            // 연결 상태 표시 기능 비활성화
            // showConnectionStatus();
        }
    });
}

// 연결 상태 표시 (비활성화됨)
function showConnectionStatus() {
    // 연결 상태 표시를 비활성화합니다
    return;
}

// Firebase에서 데이터 불러오기
function loadData() {
    // 원형 워크플로우 데이터 불러오기 (로컬스토리지 백업)
    const savedWorkflow = JSON.parse(localStorage.getItem(STORAGE_KEYS.circularWorkflow));
    if (savedWorkflow) {
        circularWorkflow = savedWorkflow;
    }
    
    // Firebase에서 실시간으로 로드
    loadSchedulesFromFirebase();
    loadBudgetsFromFirebase(); 
    loadMemosFromFirebase();
    loadWorkflowFromFirebase();
    loadImportantFromFirebase();
    
    // Firebase 연결 상태 확인
    checkFirebaseConnection();
}

// 로컬스토리지에 예산/원형워크플로우/메모 데이터 저장
function saveData() {
    localStorage.setItem(STORAGE_KEYS.budgets, JSON.stringify(budgets));
    localStorage.setItem(STORAGE_KEYS.memos, JSON.stringify(memos));
    localStorage.setItem(STORAGE_KEYS.circularWorkflow, JSON.stringify(circularWorkflow));
    // 스케쥴은 Firebase에 별도로 저장
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 탭 전환
    elements.tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // 검색 관련
    if (elements.globalSearch) {
        elements.globalSearch.addEventListener('input', handleGlobalSearch);
        elements.clearSearch.addEventListener('click', clearGlobalSearch);
    }
    if (elements.scheduleSearch) {
        elements.scheduleSearch.addEventListener('input', handleScheduleSearch);
    }
    if (elements.budgetSearch) {
        elements.budgetSearch.addEventListener('input', handleBudgetSearch);
    }
    if (elements.memoSearch) {
        elements.memoSearch.addEventListener('input', handleMemoSearch);
    }
    
    // 필터 관련
    if (elements.scheduleStatusFilter) {
        elements.scheduleStatusFilter.addEventListener('change', handleScheduleFilter);
    }
    if (elements.budgetSortFilter) {
        elements.budgetSortFilter.addEventListener('change', handleBudgetSort);
    }

    if (elements.memoSortFilter) {
        elements.memoSortFilter.addEventListener('change', handleMemoSort);
    }
    
    // 스케줄 관련
    elements.addScheduleBtn.addEventListener('click', () => openScheduleModal());
    elements.closeScheduleModal.addEventListener('click', closeScheduleModal);
    elements.cancelSchedule.addEventListener('click', closeScheduleModal);
    elements.scheduleForm.addEventListener('submit', handleScheduleSubmit);
    
    // 캘린더 관련
    elements.calendarViewBtn.addEventListener('click', () => switchView('calendar'));
    elements.listViewBtn.addEventListener('click', () => switchView('list'));
    elements.prevMonth.addEventListener('click', () => navigateMonth(-1));
    elements.nextMonth.addEventListener('click', () => navigateMonth(1));
    
    // 일정 상세보기 관련
    elements.closeScheduleDetailModal.addEventListener('click', closeScheduleDetailModal);
    elements.editFromDetail.addEventListener('click', editScheduleFromDetail);
    elements.deleteFromDetail.addEventListener('click', deleteScheduleFromDetail);
    
    // 일정 상세보기 편집 모드 관련
    const saveFromDetailBtn = document.getElementById('saveFromDetail');
    const cancelFromDetailBtn = document.getElementById('cancelFromDetail');
    
    if (saveFromDetailBtn) {
        saveFromDetailBtn.addEventListener('click', saveScheduleFromDetail);
    }
    if (cancelFromDetailBtn) {
        cancelFromDetailBtn.addEventListener('click', cancelScheduleEdit);
    }
    
    // 예산 관련
    elements.addBudgetBtn.addEventListener('click', () => openBudgetModal());
    elements.closeBudgetModal.addEventListener('click', closeBudgetModal);
    elements.cancelBudget.addEventListener('click', closeBudgetModal);
    elements.budgetForm.addEventListener('submit', handleBudgetSubmit);
    
    // 원형 워크플로우 관련
    if (document.getElementById('viewWorkflowDetails')) {
        document.getElementById('viewWorkflowDetails').addEventListener('click', openWorkflowDetailsModal);
    }
    if (document.getElementById('viewContractors')) {
        document.getElementById('viewContractors').addEventListener('click', openContractorsModal);
    }

    
    // 메모 관련
    elements.addMemoBtn.addEventListener('click', () => openMemoModal());
    elements.closeMemoModal.addEventListener('click', closeMemoModal);
    elements.cancelMemo.addEventListener('click', closeMemoModal);
    elements.memoForm.addEventListener('submit', handleMemoSubmit);
    
    // 중요사항 관련
    const addImportantBtn = document.getElementById('addImportantBtn');
    const closeImportantModalBtn = document.getElementById('closeImportantModal');
    const cancelImportantBtn = document.getElementById('cancelImportant');
    const importantForm = document.getElementById('importantForm');
    
    if (addImportantBtn) {
        addImportantBtn.addEventListener('click', () => openImportantModal());
    }
    if (closeImportantModalBtn) {
        closeImportantModalBtn.addEventListener('click', closeImportantModal);
    }
    if (cancelImportantBtn) {
        cancelImportantBtn.addEventListener('click', closeImportantModal);
    }
    if (importantForm) {
        importantForm.addEventListener('submit', handleImportantSubmit);
    }
    
    // 모달 백그라운드 클릭시 닫기
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
    
    // 터치 제스처 설정
    setupTouchGestures();
    
    // 초기 캘린더 렌더링
    renderCalendar();
}

// 탭 전환 함수
function switchTab(tabName) {
    // 모든 탭 버튼과 섹션에서 active 클래스 제거
    elements.tabButtons.forEach(btn => btn.classList.remove('active'));
    elements.contentSections.forEach(section => section.classList.remove('active'));
    
    // 선택된 탭 버튼과 섹션에 active 클래스 추가
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    // 탭 변경 시 글로벌 검색창 초기화
    if (elements.globalSearch) {
        elements.globalSearch.value = '';
        searchFilters.global = '';
        elements.clearSearch.style.display = 'none';
        
        // 해당 탭의 개별 검색창도 초기화
        if (elements.scheduleSearch) elements.scheduleSearch.value = '';
        if (elements.budgetSearch) elements.budgetSearch.value = '';
        if (elements.memoSearch) elements.memoSearch.value = '';
        
        searchFilters.schedule.text = '';
        searchFilters.workflow = '';
        searchFilters.budget.text = '';
        searchFilters.memo.text = '';
        
        // 현재 탭 다시 렌더링
        renderCurrentTab(tabName);
    }
}

// 현재 탭에 맞는 렌더링 수행
function renderCurrentTab(tabName) {
    switch (tabName) {
        case 'schedule':
            renderSchedules();
            if (currentView === 'calendar') {
                renderCalendar();
            }
            break;
        case 'workflow':
            renderCircularWorkflow();
            break;
        case 'budget':
            renderBudgets();
            break;
        case 'memo':
            renderMemos();
            break;
        case 'important':
            // 중요사항은 Firebase에서 로드되어 자동으로 렌더링됨
            break;
    }
}

// === 뷰 전환 함수 ===
function switchView(view) {
    currentView = view;
    
    // 버튼 활성화 상태 변경
    elements.calendarViewBtn.classList.toggle('active', view === 'calendar');
    elements.listViewBtn.classList.toggle('active', view === 'list');
    
    // 컨테이너 표시/숨김
    elements.calendarContainer.style.display = view === 'calendar' ? 'block' : 'none';
    elements.scheduleContainer.style.display = view === 'list' ? 'block' : 'none';
    
    if (view === 'calendar') {
        renderCalendar();
    }
}

// === 캘린더 관리 함수들 ===
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 캘린더 타이틀 업데이트
    elements.calendarTitle.textContent = `${year}년 ${month + 1}월`;
    
    // 캘린더 그리드 초기화
    elements.calendarGrid.innerHTML = '';
    
    // 요일 헤더 추가
    const dayHeaders = ['일', '월', '화', '수', '목', '금', '토'];
    dayHeaders.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        elements.calendarGrid.appendChild(dayHeader);
    });
    
    // 이번 달의 첫 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // 6주 * 7일 = 42개의 날짜 셀 생성
    for (let i = 0; i < 42; i++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + i);
        
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        
        // 다른 달의 날짜인지 확인
        if (cellDate.getMonth() !== month) {
            dayCell.classList.add('other-month');
        }
        
        // 오늘 날짜인지 확인
        const today = new Date();
        if (cellDate.toDateString() === today.toDateString()) {
            dayCell.classList.add('today');
        }
        
        // 날짜 번호
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = cellDate.getDate();
        dayCell.appendChild(dayNumber);
        
        // 이벤트 컨테이너
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'day-events';
        dayCell.appendChild(eventsContainer);
        
        // 해당 날짜의 스케줄 찾기 및 추가
        const daySchedules = getSchedulesForDate(cellDate);
        daySchedules.forEach(schedule => {
            const eventElement = createCalendarEvent(schedule, cellDate);
            eventsContainer.appendChild(eventElement);
        });
        
        // 날짜 클릭 이벤트 (빈 날짜 클릭시 일정 추가)
        dayCell.addEventListener('click', (e) => {
            if (e.target === dayCell || e.target === dayNumber) {
                if (daySchedules && daySchedules.length > 0) {
                    openDaySchedulesModal(cellDate, daySchedules);
                } else {
                    const dateStr = formatDateForInput(cellDate);
                    openScheduleModal(null, dateStr);
                }
            }
        });
        
        elements.calendarGrid.appendChild(dayCell);
    }
}

function getSchedulesForDate(date) {
    const dateStr = formatDateForInput(date);
    const filteredSchedules = getFilteredSchedules();
    return filteredSchedules.filter(schedule => {
        const startDate = schedule.startDate;
        const endDate = schedule.endDate;
        return dateStr >= startDate && dateStr <= endDate;
    });
}

function createCalendarEvent(schedule, date) {
    const eventElement = document.createElement('div');
    eventElement.className = 'calendar-event';
    
    // 상태별 스타일 추가
    if (schedule.status) {
        eventElement.classList.add(`status-${schedule.status}`);
    }
    
    const dateStr = formatDateForInput(date);
    const isStart = schedule.startDate === dateStr;
    const isEnd = schedule.endDate === dateStr;
    
    // 제목 길이 제한 (캘린더 가독성 개선)
    const truncateTitle = (title, maxLength = 12) => {
        return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
    };
    
    if (isStart && isEnd) {
        // 하루짜리 일정
        eventElement.textContent = truncateTitle(schedule.title);
    } else if (isStart) {
        eventElement.textContent = truncateTitle(schedule.title) + ' (시작)';
        eventElement.classList.add('event-start');
    } else if (isEnd) {
        eventElement.textContent = truncateTitle(schedule.title) + ' (종료)';
        eventElement.classList.add('event-end');
    } else {
        eventElement.textContent = truncateTitle(schedule.title);
        eventElement.classList.add('event-ongoing');
    }
    
    // 이벤트 클릭시 상세보기 모달 열기 (스크롤 문제 해결)
    eventElement.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // 스크롤 위치 기억
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        openScheduleDetailModal(schedule);
        // 스크롤 위치 복원
        requestAnimationFrame(() => {
            document.documentElement.scrollTop = scrollTop;
            document.body.scrollTop = scrollTop;
        });
    });
    
    return eventElement;
}

function navigateMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    renderCalendar();
}

// === 일정 상세보기 모달 함수들 ===
function openScheduleDetailModal(schedule) {
    selectedSchedule = schedule;
    
    elements.detailTitle.textContent = schedule.title;
    elements.detailPeriod.textContent = `${formatDate(schedule.startDate)} ~ ${formatDate(schedule.endDate)}`;
    elements.detailDuration.textContent = `${calculateDuration(schedule.startDate, schedule.endDate)}일`;
    elements.detailDescription.textContent = schedule.description || '설명이 없습니다.';
    
    // 상태 표시 추가 (상세보기 모달에 상태 요소가 있다면)
    const detailStatus = document.getElementById('detailStatus');
    if (detailStatus) {
        const statusText = schedule.status === 'pending' ? '대기중' : 
                          schedule.status === 'in-progress' ? '진행중' : 
                          schedule.status === 'completed' ? '완료' : '대기중';
        detailStatus.textContent = statusText;
        detailStatus.className = `status-badge ${schedule.status || 'pending'}`;
    }
    
    elements.scheduleDetailModal.style.display = 'block';
}

function closeScheduleDetailModal() {
    // 편집 모드가 활성화되어 있다면 상세보기 모드로 복원
    const editMode = document.getElementById('scheduleDetailEditMode');
    const viewMode = document.getElementById('scheduleDetailViewMode');
    const modalTitle = document.getElementById('scheduleDetailModalTitle');
    
    if (editMode && editMode.style.display !== 'none') {
        editMode.style.display = 'none';
        viewMode.style.display = 'block';
        modalTitle.textContent = '일정 상세보기';
    }
    
    // 모달 닫기
    elements.scheduleDetailModal.style.display = 'none';
    selectedSchedule = null;
}

function editScheduleFromDetail() {
    if (selectedSchedule) {
        // 모달 제목 변경
        document.getElementById('scheduleDetailModalTitle').textContent = '일정 수정';
        
        // 상세보기 모드 숨기기
        document.getElementById('scheduleDetailViewMode').style.display = 'none';
        
        // 편집 모드 표시
        document.getElementById('scheduleDetailEditMode').style.display = 'block';
        
        // 편집 폼에 현재 데이터 설정
        document.getElementById('detailEditTitle').value = selectedSchedule.title;
        document.getElementById('detailEditStartDate').value = selectedSchedule.startDate;
        document.getElementById('detailEditEndDate').value = selectedSchedule.endDate;
        document.getElementById('detailEditStatus').value = selectedSchedule.status || 'pending';
        document.getElementById('detailEditDescription').value = selectedSchedule.description || '';
    }
}

function cancelScheduleEdit() {
    // 모달 제목 복원
    document.getElementById('scheduleDetailModalTitle').textContent = '일정 상세보기';
    
    // 편집 모드 숨기기
    document.getElementById('scheduleDetailEditMode').style.display = 'none';
    
    // 상세보기 모드 표시
    document.getElementById('scheduleDetailViewMode').style.display = 'block';
}

async function saveScheduleFromDetail() {
    if (!selectedSchedule) return;
    
    const title = document.getElementById('detailEditTitle').value.trim();
    const startDate = document.getElementById('detailEditStartDate').value;
    const endDate = document.getElementById('detailEditEndDate').value;
    const status = document.getElementById('detailEditStatus').value;
    const description = document.getElementById('detailEditDescription').value.trim();
    
    if (!title || !startDate || !endDate) {
        showNotification('모든 필수 항목을 입력해주세요.', 'warning');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        showNotification('시작일은 종료일보다 이전이어야 합니다.', 'warning');
        return;
    }
    
    const scheduleData = {
        title,
        startDate,
        endDate,
        status,
        description
    };
    
    try {
        // Firebase에 저장
        await saveScheduleToFirebase(scheduleData, selectedSchedule.id);
        
        // 선택된 일정 객체 업데이트
        selectedSchedule = { ...selectedSchedule, ...scheduleData };
        
        // 상세보기 모드로 돌아가기
        cancelScheduleEdit();
        
        // 상세보기 내용 업데이트
        updateScheduleDetailView();
        
        showNotification('일정이 성공적으로 수정되었습니다.', 'success');
        
    } catch (error) {
        console.error('일정 저장 중 오류:', error);
        showNotification('일정 저장 중 오류가 발생했습니다.', 'error');
    }
}

function updateScheduleDetailView() {
    if (!selectedSchedule) return;
    
    document.getElementById('detailTitle').textContent = selectedSchedule.title;
    document.getElementById('detailPeriod').textContent = `${formatDate(selectedSchedule.startDate)} ~ ${formatDate(selectedSchedule.endDate)}`;
    document.getElementById('detailDuration').textContent = `${calculateDuration(selectedSchedule.startDate, selectedSchedule.endDate)}일`;
    
    const statusElement = document.getElementById('detailStatus');
    statusElement.textContent = getStatusText(selectedSchedule.status);
    statusElement.className = `status-badge ${selectedSchedule.status}`;
    
    document.getElementById('detailDescription').textContent = selectedSchedule.description || '설명이 없습니다.';
}

async function deleteScheduleFromDetail() {
    if (selectedSchedule) {
        const confirmed = await customConfirm('정말로 이 일정을 삭제하시겠습니까?');
        if (confirmed) {
            try {
                await deleteScheduleFromFirebase(selectedSchedule.id);
                closeScheduleDetailModal();
            } catch (error) {
                console.error('스케쥴 삭제 오류:', error);
                showNotification('일정 삭제 중 오류가 발생했습니다.', 'error');
            }
        }
    }
}

// === 스케줄 관리 함수들 ===
function openScheduleModal(schedule = null, defaultDate = null) {
    currentEditingType = 'schedule';
    currentEditingId = schedule ? schedule.id : null;
    
    // 폼 초기화 또는 데이터 설정
    if (schedule) {
        document.getElementById('scheduleTitle').value = schedule.title;
        document.getElementById('scheduleStartDate').value = schedule.startDate;
        document.getElementById('scheduleEndDate').value = schedule.endDate;
        document.getElementById('scheduleStatus').value = schedule.status || 'pending';
        document.getElementById('scheduleDescription').value = schedule.description || '';
    } else {
        elements.scheduleForm.reset();
        // 기본 날짜 설정 (캘린더에서 클릭한 날짜 또는 오늘)
        if (defaultDate) {
            document.getElementById('scheduleStartDate').value = defaultDate;
            document.getElementById('scheduleEndDate').value = defaultDate;
        } else {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('scheduleStartDate').value = today;
            document.getElementById('scheduleEndDate').value = today;
        }
    }
    
    elements.scheduleModal.style.display = 'block';
}

function closeScheduleModal() {
    elements.scheduleModal.style.display = 'none';
    currentEditingId = null;
    currentEditingType = null;
}

async function handleScheduleSubmit(e) {
    e.preventDefault();
    
    // 로딩 상태 표시
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="loading"></span> 저장 중...';
    submitBtn.disabled = true;
    
    try {
        const scheduleData = {
            title: document.getElementById('scheduleTitle').value,
            startDate: document.getElementById('scheduleStartDate').value,
            endDate: document.getElementById('scheduleEndDate').value,
            status: document.getElementById('scheduleStatus').value,
            description: document.getElementById('scheduleDescription').value
        };
        
        // Firebase에 저장
        await saveScheduleToFirebase(scheduleData, currentEditingId);
        closeScheduleModal();
        
    } catch (error) {
        console.error('스케쥴 저장 오류:', error);
        showNotification('일정 저장 중 오류가 발생했습니다.', 'error');
    } finally {
        // 로딩 상태 해제
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function deleteSchedule(id) {
    const confirmed = await customConfirm('정말로 이 일정을 삭제하시겠습니까?');
    if (confirmed) {
        try {
            await deleteScheduleFromFirebase(id);
        } catch (error) {
            console.error('스케쥴 삭제 오류:', error);
            showNotification('일정 삭제 중 오류가 발생했습니다.', 'error');
        }
    }
}

function renderSchedules() {
    // 목록 뷰 렌더링
    elements.scheduleList.innerHTML = '';
    
    const filteredSchedules = getFilteredSchedules();
    
    if (filteredSchedules.length === 0) {
        const isEmpty = schedules.length === 0;
        const message = isEmpty ? '등록된 일정이 없습니다.' : '검색 결과가 없습니다.';
        const icon = isEmpty ? 'calendar-times' : 'search';
        elements.scheduleList.innerHTML = createEmptyState(icon, message, isEmpty ? '새로운 일정을 추가해보세요.' : '다른 검색어를 시도해보세요.');
    } else {
        filteredSchedules.sort((a, b) => new Date(a.startDate) - new Date(b.startDate)).forEach(schedule => {
            const scheduleElement = document.createElement('div');
            scheduleElement.className = 'schedule-item fade-in';
            
            const titleHighlighted = highlightText(schedule.title, searchFilters.schedule.text);
            const descriptionHighlighted = schedule.description ? 
                highlightText(schedule.description, searchFilters.schedule.text) : '';
            
            scheduleElement.innerHTML = `
                <div class="item-header">
                    <h3 class="item-title">${titleHighlighted}</h3>
                    <div class="item-actions">
                        <button class="btn-edit touch-friendly" onclick="openScheduleModal(${JSON.stringify(schedule).replace(/"/g, '&quot;')})">
                            <i class="fas fa-edit"></i> 수정
                        </button>
                        <button class="btn-danger touch-friendly" onclick="deleteSchedule('${schedule.id}')">
                            <i class="fas fa-trash"></i> 삭제
                        </button>
                    </div>
                </div>
                <div class="item-meta">
                    <span><i class="fas fa-calendar-start"></i> 시작: ${formatDate(schedule.startDate)}</span>
                    <span><i class="fas fa-calendar-end"></i> 종료: ${formatDate(schedule.endDate)}</span>
                    <span><i class="fas fa-clock"></i> 기간: ${calculateDuration(schedule.startDate, schedule.endDate)}일</span>
                    <span class="status-badge ${schedule.status || 'pending'}">
                        <i class="fas fa-info-circle"></i> 
                        ${schedule.status === 'pending' ? '대기중' : 
                          schedule.status === 'in-progress' ? '진행중' : 
                          schedule.status === 'completed' ? '완료' : '대기중'}
                    </span>
                </div>
                ${descriptionHighlighted ? `<div class="item-description">${descriptionHighlighted}</div>` : ''}
            `;
            
            // 일정 클릭 시 상세보기
            scheduleElement.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    e.preventDefault();
                    e.stopPropagation();
                    openScheduleDetailModal(schedule);
                }
            });
            
            elements.scheduleList.appendChild(scheduleElement);
        });
    }
    
    // 캘린더 뷰 업데이트 (현재 캘린더 뷰가 활성화된 경우)
    if (currentView === 'calendar') {
        renderCalendar();
    }
    
    updateTabCounts();
}

// === 예산 관리 함수들 ===
function openBudgetModal(budget = null) {
    currentEditingType = 'budget';
    currentEditingId = budget ? budget.id : null;
    
    if (budget) {
        document.getElementById('budgetCategory').value = budget.category;
        document.getElementById('budgetEstimated').value = formatCurrencyForInput(budget.estimated || 0);
        document.getElementById('budgetUsed').value = formatCurrencyForInput(budget.used || 0);
        document.getElementById('budgetNote').value = budget.note || '';
    } else {
        elements.budgetForm.reset();
    }
    
    elements.budgetModal.style.display = 'block';
    
    // 금액 입력 필드에 포맷팅 이벤트 리스너 추가
    setupBudgetInputFormatting();
}

function closeBudgetModal() {
    elements.budgetModal.style.display = 'none';
    currentEditingId = null;
    currentEditingType = null;
}

async function handleBudgetSubmit(e) {
    e.preventDefault();
    
    const budgetData = {
        category: document.getElementById('budgetCategory').value,
        estimated: parseNumberFromCurrency(document.getElementById('budgetEstimated').value) || 0,
        used: parseNumberFromCurrency(document.getElementById('budgetUsed').value) || 0,
        note: document.getElementById('budgetNote').value
    };
    
    // Firebase에 저장
    await saveBudgetToFirebase(budgetData, currentEditingId);
    
    closeBudgetModal();
}

async function deleteBudget(id) {
    const confirmed = await customConfirm('정말로 이 예산 항목을 삭제하시겠습니까?');
    if (confirmed) {
        // Firebase에서 삭제
        await deleteBudgetFromFirebase(id);
    }
}

function renderBudgets() {
    // 예산 요약 업데이트
    updateBudgetSummary();
    
    // 예산 목록 렌더링
    elements.budgetList.innerHTML = '';
    
    const filteredBudgets = getFilteredBudgets();
    
    if (filteredBudgets.length === 0) {
        const isEmpty = budgets.length === 0;
        const message = isEmpty ? '등록된 예산 항목이 없습니다.' : '검색 결과가 없습니다.';
        const icon = isEmpty ? 'dollar-sign' : 'search';
        elements.budgetList.innerHTML = createEmptyState(icon, message, isEmpty ? '새로운 예산 항목을 추가해보세요.' : '다른 검색어를 시도해보세요.');
        return;
    }
    
    filteredBudgets.forEach(budget => {
        const budgetElement = document.createElement('div');
        budgetElement.className = 'budget-item fade-in';
        
        const categoryHighlighted = highlightText(budget.category, searchFilters.budget.text);
        const noteHighlighted = budget.note ? 
            highlightText(budget.note, searchFilters.budget.text) : '';
        
        budgetElement.innerHTML = `
            <div class="item-header">
                <h3 class="item-title">${categoryHighlighted}</h3>
                <div class="item-actions">
                    <button class="btn-edit touch-friendly" onclick="openBudgetModal(${JSON.stringify(budget).replace(/"/g, '&quot;')})">
                        <i class="fas fa-edit"></i> 수정
                    </button>
                    <button class="btn-danger touch-friendly" onclick="deleteBudget('${budget.id}')">
                        <i class="fas fa-trash"></i> 삭제
                    </button>
                </div>
            </div>
            <div class="item-meta">
                <span><i class="fas fa-calculator"></i> 예상 금액: ${formatCurrency(budget.estimated || 0)}</span>
                <span><i class="fas fa-credit-card"></i> 사용 금액: ${formatCurrency(budget.used)}</span>
            </div>
            ${noteHighlighted ? `<div class="item-description"><i class="fas fa-sticky-note"></i> ${noteHighlighted}</div>` : ''}
        `;
        elements.budgetList.appendChild(budgetElement);
    });
    
    updateTabCounts();
}

function updateBudgetSummary() {
    const totalBudget = 15000000; // 총 예산 1500만원 고정
    const used = budgets.reduce((sum, budget) => sum + budget.used, 0);
    
    // 예상 예산 계산 (사용금액이 0이고 예상금액만 있는 경우 예상금액 사용)
    const estimatedUsed = budgets.reduce((sum, budget) => {
        if (budget.used > 0) {
            return sum + budget.used; // 실제 사용금액 있으면 사용금액 사용
        } else if (budget.estimated > 0) {
            return sum + budget.estimated; // 예상금액만 있으면 예상금액 사용
        }
        return sum;
    }, 0);
    
    const remaining = totalBudget - used;
    const estimatedRemaining = totalBudget - estimatedUsed;
    
    elements.totalBudget.textContent = formatCurrency(totalBudget);
    elements.usedBudget.textContent = formatCurrency(used);
    
    // 예상 예산이 실제 사용 예산과 다른 경우 예상 잔여예산 표시
    if (estimatedUsed !== used) {
        elements.remainingBudget.innerHTML = `
            ${formatCurrency(remaining)}
            <div class="estimated-remaining">예상 잔여: ${formatCurrency(estimatedRemaining)}</div>
        `;
    } else {
        elements.remainingBudget.textContent = formatCurrency(remaining);
    }
}

// === 메모 관리 함수들 ===

function openMemoModal(memo = null) {
    currentEditingType = 'memo';
    currentEditingId = memo ? memo.id : null;
    
    if (memo) {
        document.getElementById('memoTitle').value = memo.title;
        document.getElementById('memoContent').value = memo.content || '';
        document.getElementById('memoCompleted').checked = memo.completed || false;
    } else {
        elements.memoForm.reset();
        document.getElementById('memoCompleted').checked = false;
    }
    
    elements.memoModal.style.display = 'block';
}

function closeMemoModal() {
    elements.memoModal.style.display = 'none';
    currentEditingId = null;
    currentEditingType = null;
}

async function handleMemoSubmit(e) {
    e.preventDefault();
    
    try {
        // Firebase 연결 상태 확인
        const connectedRef = database.ref('.info/connected');
        const snapshot = await connectedRef.once('value');
        
        if (!snapshot.val()) {
            showNotification('인터넷 연결을 확인하세요. Firebase에 연결할 수 없습니다.', 'error');
            return;
        }
        
        const memoData = {
            title: document.getElementById('memoTitle').value,
            content: document.getElementById('memoContent').value,
            completed: document.getElementById('memoCompleted').checked,
            createdAt: currentEditingId ? 
                (memos.find(m => m.id === currentEditingId)?.createdAt || new Date().toISOString()) : 
                new Date().toISOString()
        };
        
        if (!memoData.content.trim()) {
            showNotification('메모 내용을 입력해주세요.', 'warning');
            return;
        }
        
        // Firebase에 저장
        await saveMemoToFirebase(memoData, currentEditingId);
        
        closeMemoModal();
        
    } catch (error) {
        console.error('메모 저장 중 오류:', error);
        showNotification('메모 저장 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    }
}

// 메모 완료 상태 토글
async function toggleMemoCompleted(memoId, completed) {
    try {
        // Firebase 연결 상태 확인
        const connectedRef = database.ref('.info/connected');
        const snapshot = await connectedRef.once('value');
        
        if (!snapshot.val()) {
            showNotification('인터넷 연결을 확인하세요. Firebase에 연결할 수 없습니다.', 'error');
            return;
        }
        
        // Firebase에서 업데이트
        await updateMemoCompletedInFirebase(memoId, completed);
        
    } catch (error) {
        console.error('메모 상태 변경 중 오류:', error);
        showNotification('메모 상태 변경 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    }
}

async function deleteMemo(id) {
    try {
        // Firebase 연결 상태 확인
        const connectedRef = database.ref('.info/connected');
        const snapshot = await connectedRef.once('value');
        
        if (!snapshot.val()) {
            showNotification('인터넷 연결을 확인하세요. Firebase에 연결할 수 없습니다.', 'error');
            return;
        }
        
        const confirmed = await customConfirm('정말로 이 메모를 삭제하시겠습니까?');
        
        if (confirmed) {
            // Firebase에서 삭제
            await deleteMemoFromFirebase(id);
        }
    } catch (error) {
        console.error('메모 삭제 중 오류:', error);
        showNotification('메모 삭제 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    }
}

function renderMemos() {
    elements.memoList.innerHTML = '';
    
    const filteredMemos = getFilteredMemos();
    
    if (filteredMemos.length === 0) {
        const isEmpty = memos.length === 0;
        const message = isEmpty ? '등록된 메모가 없습니다.' : '검색 결과가 없습니다.';
        const icon = isEmpty ? 'sticky-note' : 'search';
        elements.memoList.innerHTML = createEmptyState(icon, message, isEmpty ? '새로운 메모를 추가해보세요.' : '다른 검색어를 시도해보세요.');
        return;
    }
    
    filteredMemos.forEach(memo => {
        const memoElement = document.createElement('div');
        memoElement.className = 'memo-item fade-in';
        
        const titleHighlighted = highlightText(memo.title, searchFilters.memo.text);
        
        const createdDate = new Date(memo.createdAt);
        const formattedDate = createdDate.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const content = memo.content || '';
        const contentHighlighted = highlightText(content, searchFilters.memo.text);
        
        memoElement.className = `memo-item fade-in ${memo.completed ? 'completed' : ''}`;
        
        memoElement.innerHTML = `
            <div class="item-header">
                <div class="memo-title-section">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" ${memo.completed ? 'checked' : ''} 
                               onchange="toggleMemoCompleted('${memo.id}', this.checked)"
                               style="width: 18px; height: 18px; cursor: pointer;">
                        <h3 class="item-title">${titleHighlighted}</h3>
                        ${memo.completed ? '<span class="memo-completed-badge"><i class="fas fa-check"></i> 완료</span>' : ''}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-edit touch-friendly" onclick="openMemoModal(${JSON.stringify(memo).replace(/"/g, '&quot;')})">
                        <i class="fas fa-edit"></i> 수정
                    </button>
                    <button class="btn-danger touch-friendly" onclick="deleteMemo('${memo.id}')" 
                            style="display: inline-block; opacity: 1; pointer-events: auto;">
                        <i class="fas fa-trash"></i> 삭제
                    </button>
                </div>
            </div>
            <div class="memo-content">
                <p>${contentHighlighted.replace(/\n/g, '<br>')}</p>
            </div>
            <div class="item-meta">
                <span><i class="fas fa-clock"></i> ${formattedDate}</span>
            </div>
        `;
        elements.memoList.appendChild(memoElement);
    });
    
    updateTabCounts();
}

// === 원형 워크플로우 관리 함수들 ===
function renderCircularWorkflow() {
    const searchQuery = searchFilters.workflow ? searchFilters.workflow.toLowerCase() : '';
    
    // 원형 워크플로우의 각 단계 업데이트
    circularWorkflow.forEach(step => {
        const stepElement = document.querySelector(`[data-step="${step.id}"]`);
        if (stepElement) {
            // 아이콘 업데이트
            const iconElement = stepElement.querySelector('.step-icon i');
            iconElement.className = `fas fa-${step.icon}`;
            
            // 상태 업데이트
            stepElement.setAttribute('data-status', step.status);
            const statusElement = stepElement.querySelector('.step-status-badge');
            if (statusElement) {
                statusElement.setAttribute('data-status', step.status);
                statusElement.textContent = getStatusText(step.status);
            }
            
            // 검색어 하이라이트 적용
            const titleElement = stepElement.querySelector('.step-title');
            const descriptionElement = stepElement.querySelector('.step-description');
            
            if (titleElement) {
                const isMatch = searchQuery && step.name.toLowerCase().includes(searchQuery);
                titleElement.innerHTML = searchQuery && searchQuery.length >= 1 ? 
                    highlightText(step.name, searchQuery) : step.name;
                
                // 검색 필터링 표시
                if (searchQuery && searchQuery.length >= 1) {
                    if (isMatch || (step.details && step.details.toLowerCase().includes(searchQuery))) {
                        stepElement.style.opacity = '1';
                        stepElement.style.transform = 'scale(1)';
                        stepElement.classList.add('search-match');
                    } else {
                        stepElement.style.opacity = '0.3';
                        stepElement.style.transform = 'scale(0.95)';
                        stepElement.classList.remove('search-match');
                    }
                } else {
                    stepElement.style.opacity = '1';
                    stepElement.style.transform = 'scale(1)';
                    stepElement.classList.remove('search-match');
                }
            }
            
            // 클릭 이벤트 추가
            stepElement.addEventListener('click', () => openWorkflowStepModal(step));
        }
    });
    
    // 전체 진행률 계산 및 업데이트
    updateOverallProgress();
    
    // 연결선 그리기
    setTimeout(() => drawWorkflowConnections(), 100);
}

function updateOverallProgress() {
    const completedSteps = circularWorkflow.filter(step => step.status === 'completed').length;
    const progressPercentage = Math.round((completedSteps / circularWorkflow.length) * 100);
    
    const progressElement = document.getElementById('overallProgress');
    if (progressElement) {
        progressElement.textContent = `${progressPercentage}%`;
    }
}

function drawWorkflowConnections() {
    const svg = document.querySelector('.workflow-connections');
    if (!svg) return;
    
    // 기존 연결선 제거
    const existingPaths = svg.querySelectorAll('path');
    existingPaths.forEach(path => path.remove());
    
    // 각 단계 간의 연결선 그리기
    for (let i = 0; i < circularWorkflow.length; i++) {
        const currentStep = circularWorkflow[i];
        const nextStep = circularWorkflow[(i + 1) % circularWorkflow.length];
        
        const currentElement = document.querySelector(`[data-step="${currentStep.id}"]`);
        const nextElement = document.querySelector(`[data-step="${nextStep.id}"]`);
        
        if (currentElement && nextElement) {
            const path = createConnectionPath(currentElement, nextElement);
            if (currentStep.status === 'completed') {
                path.classList.add('completed-path');
            }
            svg.appendChild(path);
        }
    }
}

function createConnectionPath(fromElement, toElement) {
    const fromRect = fromElement.getBoundingClientRect();
    const toRect = toElement.getBoundingClientRect();
    const svgRect = document.querySelector('.workflow-connections').getBoundingClientRect();
    
    const fromX = fromRect.left + fromRect.width / 2 - svgRect.left;
    const fromY = fromRect.top + fromRect.height / 2 - svgRect.top;
    const toX = toRect.left + toRect.width / 2 - svgRect.left;
    const toY = toRect.top + toRect.height / 2 - svgRect.top;
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = `M ${fromX} ${fromY} Q ${(fromX + toX) / 2} ${(fromY + toY) / 2 - 20} ${toX} ${toY}`;
    path.setAttribute('d', d);
    path.setAttribute('marker-end', 'url(#arrowhead)');
    
    return path;
}

function openWorkflowStepModal(step) {
    try {
        console.log('🔧 입주청소 관리 모달 열기 시도:', step.name);
        
        if (!step) {
            console.error('❌ 단계 정보가 없습니다');
            showNotification('단계 정보를 찾을 수 없습니다.', 'error');
            return;
        }
        
        currentEditingWorkflowStep = step;
        
        // 안전한 모달 HTML 구조 생성
        const modalHTML = `
            <div id="workflowStepModal" class="modal">
                <div class="modal-content step-modal-content">
                    <div class="modal-header step-modal-header">
                        <div class="step-modal-title-section">
                            <div class="step-modal-icon">
                                <i class="fas fa-${step.icon}"></i>
                            </div>
                            <div class="step-modal-title-info">
                                <h2>${step.name} 단계 관리</h2>
                                <p>시공 단계별 세부 정보를 관리합니다</p>
                            </div>
                        </div>
                        <span class="close step-modal-close" onclick="closeWorkflowStepModal()">&times;</span>
                    </div>
                    <div class="modal-body step-modal-body">
                        <!-- 상태 관리 섹션 -->
                        <div class="step-section">
                            <div class="section-header">
                                <div class="section-icon">
                                    <i class="fas fa-tasks"></i>
                                </div>
                                <h3>진행 상태</h3>
                            </div>
                            <div class="section-content">
                                <div class="status-badges">
                                    <div class="status-badge-item ${step.status === 'pending' ? 'active' : ''}" data-status="pending">
                                        <span class="status-icon">🕐</span>
                                        <span class="status-text">대기중</span>
                                    </div>
                                    <div class="status-badge-item ${step.status === 'in-progress' ? 'active' : ''}" data-status="in-progress">
                                        <span class="status-icon">▶️</span>
                                        <span class="status-text">진행중</span>
                                    </div>
                                    <div class="status-badge-item ${step.status === 'completed' ? 'active' : ''}" data-status="completed">
                                        <span class="status-icon">✅</span>
                                        <span class="status-text">완료</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 세부 내용 섹션 -->
                        <div class="step-section">
                            <div class="section-header">
                                <div class="section-icon">
                                    <i class="fas fa-file-alt"></i>
                                </div>
                                <h3>세부 내용</h3>
                            </div>
                            <div class="section-content">
                                <div class="details-input-container">
                                    <textarea id="stepDetails" class="details-textarea" rows="4" placeholder="${step.name} 시공의 세부 내용을 상세히 입력해주세요...">${step.details || ''}</textarea>
                                    <div class="textarea-info">
                                        <i class="fas fa-info-circle"></i>
                                        시공 과정, 주의사항, 필요한 자재 등을 기록하세요
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 업체 관리 섹션 -->
                        <div class="step-section">
                            <div class="section-header">
                                <div class="section-icon">
                                    <i class="fas fa-users"></i>
                                </div>
                                <h3>업체 관리</h3>
                                <button type="button" class="btn-add-contractor" onclick="addContractor()">
                                    <i class="fas fa-plus"></i> 추가
                                </button>
                            </div>
                            <div class="section-content">
                                <div id="contractorsList" class="contractors-container">
                                    ${renderContractorsListSimple(step.contractors || [])}
                                </div>
                            </div>
                        </div>
                        
                        <!-- 이미지 업로드 섹션 -->
                        <div class="step-section">
                            <div class="section-header">
                                <div class="section-icon">
                                    <i class="fas fa-images"></i>
                                </div>
                                <h3>시공 이미지</h3>
                                <button type="button" class="btn-add-image" onclick="addWorkflowImage(${step.id})">
                                    <i class="fas fa-plus"></i> 업로드
                                </button>
                            </div>
                            <div class="section-content">
                                <div id="images-${step.id}" class="images-container">
                                    ${step.images && step.images.length > 0 ? step.images.map((imageData, index) => createImagePreview(imageData, step.id, index)).join('') : '<p class="no-images">업로드된 이미지가 없습니다.</p>'}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer step-modal-footer">
                        <button type="button" class="btn-secondary btn-cancel" onclick="closeWorkflowStepModal()">
                            <i class="fas fa-times"></i> 취소
                        </button>
                        <button type="button" class="btn-primary btn-save" onclick="saveWorkflowStep()">
                            <i class="fas fa-save"></i> 저장
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // 기존 모달 제거
        const existingModal = document.getElementById('workflowStepModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 새 모달 추가
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = document.getElementById('workflowStepModal');
        
        if (modal) {
            modal.style.display = 'flex';
            console.log('✅ 모달이 성공적으로 생성되었습니다');
            
            // 상태 배지 클릭 이벤트 설정
            setupStatusBadges();
            
            // 이미지 목록 렌더링
            renderWorkflowImages(step.id);
            
            showNotification(`${step.name} 관리 모달이 열렸습니다.`, 'success');
        } else {
            console.error('❌ 모달 생성에 실패했습니다');
            showNotification('모달을 열 수 없습니다.', 'error');
        }
        
    } catch (error) {
        console.error('❌ 모달 열기 중 오류:', error);
        showNotification('모달을 열 수 없습니다: ' + error.message, 'error');
    }
}

function setupStatusBadges() {
    const statusBadges = document.querySelectorAll('.status-badge-item');
    statusBadges.forEach(badge => {
        badge.addEventListener('click', function() {
            // 모든 배지에서 active 클래스 제거
            statusBadges.forEach(b => b.classList.remove('active'));
            // 클릭한 배지에 active 클래스 추가
            this.classList.add('active');
        });
    });
}

function renderContractorsListImproved(contractors) {
    if (!contractors || contractors.length === 0) {
        return `
            <div class="empty-contractors">
                <div class="empty-icon">
                    <i class="fas fa-building"></i>
                </div>
                <h4>등록된 업체가 없습니다</h4>
                <p>시공 업체를 추가하여 관리해보세요</p>
            </div>
        `;
    }
    
    return contractors.map((contractor, index) => `
        <div class="contractor-card">
            <div class="contractor-card-header">
                <div class="contractor-number">${index + 1}</div>
                <div class="contractor-inputs">
                    <input type="text" class="contractor-name-input" value="${contractor.name || ''}" placeholder="업체명을 입력하세요">
                    <input type="text" class="contractor-phone-input" value="${contractor.phone || ''}" placeholder="연락처를 입력하세요">
                </div>
                <label class="contractor-selection">
                    <input type="checkbox" class="contractor-checkbox" ${contractor.selected ? 'checked' : ''}>
                    <div class="checkbox-custom">
                        <i class="fas fa-check"></i>
                    </div>
                    <span class="selection-text">최종 선정</span>
                </label>
                <button type="button" class="btn-remove-contractor" onclick="removeContractor(${index})" title="업체 삭제">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function renderContractorsListSimple(contractors) {
    if (!contractors || contractors.length === 0) {
        return `
            <div class="empty-contractors-simple">
                <i class="fas fa-users"></i>
                <p>업체를 추가해주세요</p>
            </div>
        `;
    }
    
    return contractors.map((contractor, index) => `
        <div class="contractor-item-simple">
            <span class="contractor-number">${index + 1}</span>
            <div class="contractor-inputs">
                <input type="text" class="contractor-name-input" value="${contractor.name || ''}" placeholder="업체명">
                <input type="text" class="contractor-phone-input" value="${contractor.phone || ''}" placeholder="연락처">
            </div>
            <label class="contractor-checkbox-simple">
                <input type="checkbox" class="contractor-checkbox" ${contractor.selected ? 'checked' : ''}>
                선정
            </label>
            <button type="button" class="btn-remove-simple" onclick="removeContractor(${index})" title="삭제">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}



function addContractor() {
    const containersList = document.getElementById('contractorsList');
    const emptyState = containersList.querySelector('.empty-contractors-simple');
    
    if (emptyState) {
        emptyState.remove();
    }
    
    const contractorCount = containersList.querySelectorAll('.contractor-item-simple').length;
    const newContractorHTML = `
        <div class="contractor-item-simple">
            <span class="contractor-number">${contractorCount + 1}</span>
            <div class="contractor-inputs">
                <input type="text" class="contractor-name-input" placeholder="업체명">
                <input type="text" class="contractor-phone-input" placeholder="연락처">
            </div>
            <label class="contractor-checkbox-simple">
                <input type="checkbox" class="contractor-checkbox">
                선정
            </label>
            <button type="button" class="btn-remove-simple" onclick="this.closest('.contractor-item-simple').remove(); updateContractorNumbers()" title="삭제">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    containersList.insertAdjacentHTML('beforeend', newContractorHTML);
}

function removeContractor(index) {
    const contractorItems = document.querySelectorAll('.contractor-item-simple');
    if (contractorItems[index]) {
        contractorItems[index].remove();
        updateContractorNumbers();
        
        // 모든 항목이 제거되면 빈 상태 표시
        const containersList = document.getElementById('contractorsList');
        if (containersList.children.length === 0) {
            containersList.innerHTML = `
                <div class="empty-contractors-simple">
                    <i class="fas fa-users"></i>
                    <p>업체를 추가해주세요</p>
                </div>
            `;
        }
    }
}

function updateContractorNumbers() {
    const contractorItems = document.querySelectorAll('.contractor-item-simple');
    contractorItems.forEach((item, index) => {
        const numberElement = item.querySelector('.contractor-number');
        if (numberElement) {
            numberElement.textContent = index + 1;
        }
    });
}

async function saveWorkflowStep() {
    if (!currentEditingWorkflowStep) return;
    
    const activeStatusBadge = document.querySelector('.status-badge-item.active');
    const status = activeStatusBadge ? activeStatusBadge.dataset.status : 'pending';
    const details = document.getElementById('stepDetails').value;
    
    // 데이터 업데이트
    const stepIndex = circularWorkflow.findIndex(s => s.id === currentEditingWorkflowStep.id);
    if (stepIndex !== -1) {
        circularWorkflow[stepIndex].status = status;
        circularWorkflow[stepIndex].details = details;
        
        // 업체 정보 수집
        const contractorItems = document.querySelectorAll('.contractor-item-simple');
        const contractors = [];
        
        contractorItems.forEach(item => {
            const nameInput = item.querySelector('.contractor-name-input');
            const phoneInput = item.querySelector('.contractor-phone-input');
            const checkbox = item.querySelector('.contractor-checkbox');
            
            if (nameInput.value.trim()) {
                contractors.push({
                    name: nameInput.value.trim(),
                    phone: phoneInput.value.trim(),
                    selected: checkbox.checked
                });
            }
        });
        
        circularWorkflow[stepIndex].contractors = contractors;
    }
    
    // 로컬 스토리지에 저장
    saveData();
    
    // Firebase에 워크플로우 저장
    try {
        await saveWorkflowToFirebase();
        renderTimelineWorkflow(); // 새로운 타임라인 렌더링 함수 호출
        closeWorkflowStepModal();
        showNotification(`${currentEditingWorkflowStep.name} 단계가 성공적으로 업데이트되었습니다.`, 'success');
    } catch (error) {
        console.error('워크플로우 저장 중 오류:', error);
        renderTimelineWorkflow();
        closeWorkflowStepModal();
        showNotification(`${currentEditingWorkflowStep.name} 단계가 로컬에 저장되었지만 온라인 동기화에 실패했습니다.`, 'warning');
    }
}

function closeWorkflowStepModal() {
    const modal = document.getElementById('workflowStepModal');
    if (modal) {
        modal.remove();
    }
    currentEditingWorkflowStep = null;
}

function openWorkflowDetailsModal() {
    // 전체 시공 단계의 세부 내용 관리 모달
    const modalHTML = `
        <div id="workflowDetailsModal" class="modal">
            <div class="modal-content wide-modal">
                <div class="modal-header">
                    <h2>전체 시공 단계 세부 내용 관리</h2>
                    <span class="close" onclick="closeWorkflowDetailsModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="details-grid">
                        ${circularWorkflow.map(step => `
                            <div class="detail-card" data-step-id="${step.id}">
                                <div class="detail-card-header">
                                    <div class="detail-icon">
                                        <i class="fas fa-${step.icon}"></i>
                                    </div>
                                    <h3>${step.name}</h3>
                                    <span class="detail-status status-${step.status}">${getStatusText(step.status)}</span>
                                </div>
                                <div class="detail-card-body">
                                    <label>세부 내용:</label>
                                    <textarea class="detail-input" data-step-id="${step.id}" rows="4" placeholder="${step.name} 시공의 세부 내용을 입력하세요...">${step.details || ''}</textarea>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="closeWorkflowDetailsModal()">취소</button>
                    <button type="button" class="btn-primary" onclick="saveAllWorkflowDetails()">모든 변경사항 저장</button>
                </div>
            </div>
        </div>
    `;
    
    // 기존 모달 제거
    const existingModal = document.getElementById('workflowDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('workflowDetailsModal').style.display = 'flex';
}

function closeWorkflowDetailsModal() {
    const modal = document.getElementById('workflowDetailsModal');
    if (modal) {
        modal.remove();
    }
}

async function saveAllWorkflowDetails() {
    const detailInputs = document.querySelectorAll('.detail-input');
    
    detailInputs.forEach(input => {
        const stepId = parseInt(input.dataset.stepId);
        const stepIndex = circularWorkflow.findIndex(s => s.id === stepId);
        if (stepIndex !== -1) {
            circularWorkflow[stepIndex].details = input.value;
        }
    });
    
    saveData();
    
    // Firebase에 저장
    try {
        await saveWorkflowToFirebase();
        renderCircularWorkflow();
        closeWorkflowDetailsModal();
        showNotification('모든 세부 내용이 성공적으로 저장되었습니다.', 'success');
    } catch (error) {
        console.error('세부 내용 저장 중 오류:', error);
        renderCircularWorkflow();
        closeWorkflowDetailsModal();
        showNotification('세부 내용이 로컬에 저장되었지만 온라인 동기화에 실패했습니다.', 'warning');
    }
}

function openContractorsModal() {
    // 간소화된 업체 관리 모달
    const modalHTML = `
        <div id="contractorsModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>업체 관리</h2>
                    <span class="close" onclick="closeContractorsModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="contractors-compact">
                        ${circularWorkflow.map(step => `
                            <div class="contractor-section-compact" data-step-id="${step.id}">
                                <div class="contractor-header-compact">
                                    <i class="fas fa-${step.icon}"></i>
                                    <span class="section-title">${step.name}</span>
                                    <span class="contractor-count-compact">(${step.contractors.length}개)</span>
                                    <button type="button" class="btn-add-compact" onclick="addContractorToStep(${step.id})">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                </div>
                                <div class="contractors-list-compact" id="contractors-${step.id}">
                                    ${renderContractorsForStepCompact(step)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="closeContractorsModal()">취소</button>
                    <button type="button" class="btn-primary" onclick="saveAllContractors()">저장</button>
                </div>
            </div>
        </div>
    `;
    
    // 기존 모달 제거
    const existingModal = document.getElementById('contractorsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('contractorsModal').style.display = 'flex';
}

function closeContractorsModal() {
    const modal = document.getElementById('contractorsModal');
    if (modal) {
        modal.remove();
    }
}

function renderContractorsForStep(step) {
    if (!step.contractors || step.contractors.length === 0) {
        return '<p class="no-contractors">등록된 업체가 없습니다.</p>';
    }
    
    return step.contractors.map((contractor, index) => `
        <div class="contractor-item-card">
            <div class="contractor-info">
                <input type="text" class="contractor-name-input" value="${contractor.name}" placeholder="업체명" data-step-id="${step.id}" data-contractor-index="${index}">
                <label class="contractor-selected-label">
                    <input type="checkbox" class="contractor-selected-checkbox" ${contractor.selected ? 'checked' : ''} data-step-id="${step.id}" data-contractor-index="${index}">
                    <span class="selected-text">${contractor.selected ? '선정됨' : '후보'}</span>
                </label>
            </div>
            <button type="button" class="btn-danger btn-small" onclick="removeContractorFromStep(${step.id}, ${index})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function renderContractorsForStepCompact(step) {
    if (!step.contractors || step.contractors.length === 0) {
        return '<p class="no-contractors-compact">업체 없음</p>';
    }
    
    return step.contractors.map((contractor, index) => `
        <div class="contractor-item-compact">
            <input type="text" class="contractor-name-compact" value="${contractor.name}" placeholder="업체명" data-step-id="${step.id}" data-contractor-index="${index}">
            <label class="contractor-checkbox-compact">
                <input type="checkbox" class="contractor-selected-checkbox" ${contractor.selected ? 'checked' : ''} data-step-id="${step.id}" data-contractor-index="${index}">
                <span class="checkbox-label">${contractor.selected ? '선정' : '후보'}</span>
            </label>
            <button type="button" class="btn-remove-compact" onclick="removeContractorFromStep(${step.id}, ${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function addContractorToStep(stepId) {
    const contractorsList = document.getElementById(`contractors-${stepId}`);
    const step = circularWorkflow.find(s => s.id === stepId);
    const newIndex = step.contractors.length;
    
    // 간소화된 버전인지 확인
    const isCompact = contractorsList.parentElement.classList.contains('contractor-section-compact');
    
    let newContractorHTML;
    if (isCompact) {
        newContractorHTML = `
            <div class="contractor-item-compact">
                <input type="text" class="contractor-name-compact" placeholder="업체명" data-step-id="${stepId}" data-contractor-index="${newIndex}">
                <label class="contractor-checkbox-compact">
                    <input type="checkbox" class="contractor-selected-checkbox" data-step-id="${stepId}" data-contractor-index="${newIndex}">
                    <span class="checkbox-label">후보</span>
                </label>
                <button type="button" class="btn-remove-compact" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    } else {
        newContractorHTML = `
            <div class="contractor-item-card">
                <div class="contractor-info">
                    <input type="text" class="contractor-name-input" placeholder="업체명" data-step-id="${stepId}" data-contractor-index="${newIndex}">
                    <label class="contractor-selected-label">
                        <input type="checkbox" class="contractor-selected-checkbox" data-step-id="${stepId}" data-contractor-index="${newIndex}">
                        <span class="selected-text">후보</span>
                    </label>
                </div>
                <button type="button" class="btn-danger btn-small" onclick="this.parentElement.remove()">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }
    
    // "등록된 업체가 없습니다" 메시지 제거
    const noContractorsMsg = contractorsList.querySelector('.no-contractors, .no-contractors-compact');
    if (noContractorsMsg) {
        noContractorsMsg.remove();
    }
    
    contractorsList.insertAdjacentHTML('beforeend', newContractorHTML);
}

function removeContractorFromStep(stepId, contractorIndex) {
    const contractorCards = document.querySelectorAll(`[data-step-id="${stepId}"][data-contractor-index="${contractorIndex}"]`);
    contractorCards.forEach(card => {
        card.closest('.contractor-item-card').remove();
    });
    
    // 해당 단계의 남은 업체가 없으면 메시지 표시
    const contractorsList = document.getElementById(`contractors-${stepId}`);
    if (contractorsList.children.length === 1) { // 버튼만 남음
        contractorsList.insertAdjacentHTML('afterbegin', '<p class="no-contractors">등록된 업체가 없습니다.</p>');
    }
}

async function saveAllContractors() {
    circularWorkflow.forEach(step => {
        // 간소화된 버전과 일반 버전 모두 지원
        const nameInputs = document.querySelectorAll(`[data-step-id="${step.id}"].contractor-name-input, [data-step-id="${step.id}"].contractor-name-compact`);
        const selectedInputs = document.querySelectorAll(`[data-step-id="${step.id}"].contractor-selected-checkbox`);
        
        const contractors = [];
        nameInputs.forEach((nameInput, index) => {
            if (nameInput.value.trim()) {
                const isSelected = selectedInputs[index] ? selectedInputs[index].checked : false;
                contractors.push({
                    name: nameInput.value.trim(),
                    selected: isSelected
                });
            }
        });
        
        step.contractors = contractors;
    });
    
    saveData();
    
    // Firebase에 저장
    try {
        await saveWorkflowToFirebase();
        renderCircularWorkflow();
        closeContractorsModal();
        showNotification('업체 정보가 저장되었습니다.', 'success');
    } catch (error) {
        console.error('업체 정보 저장 중 오류:', error);
        renderCircularWorkflow();
        closeContractorsModal();
        showNotification('업체 정보가 로컬에 저장되었습니다.', 'warning');
    }
}

function openProgressUpdateModal() {
    // 간소화된 진행 상황 업데이트 모달
    const modalHTML = `
        <div id="progressUpdateModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>진행 상황 업데이트</h2>
                    <span class="close" onclick="closeProgressUpdateModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="progress-summary-compact">
                        <p><strong>완료:</strong> ${circularWorkflow.filter(s => s.status === 'completed').length}단계 | 
                        <strong>진행중:</strong> ${circularWorkflow.filter(s => s.status === 'in-progress').length}단계 | 
                        <strong>대기:</strong> ${circularWorkflow.filter(s => s.status === 'pending').length}단계</p>
                    </div>
                    
                    <div class="progress-steps-compact">
                        ${circularWorkflow.map(step => `
                            <div class="progress-step-compact" data-step-id="${step.id}">
                                <div class="step-info-compact">
                                    <i class="fas fa-${step.icon}"></i>
                                    <span class="step-name">${step.name}</span>
                                </div>
                                <div class="step-controls-compact">
                                    <select class="status-select-compact" data-step-id="${step.id}">
                                        <option value="pending" ${step.status === 'pending' ? 'selected' : ''}>대기</option>
                                        <option value="in-progress" ${step.status === 'in-progress' ? 'selected' : ''}>진행중</option>
                                        <option value="completed" ${step.status === 'completed' ? 'selected' : ''}>완료</option>
                                    </select>
                                    <span class="progress-percent">${step.progress || 0}%</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="quick-actions-compact">
                        <button type="button" class="btn-secondary btn-small" onclick="markAllCompleted()">전체 완료</button>
                        <button type="button" class="btn-secondary btn-small" onclick="resetAllProgress()">초기화</button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="closeProgressUpdateModal()">취소</button>
                    <button type="button" class="btn-primary" onclick="saveProgressUpdates()">저장</button>
                </div>
            </div>
        </div>
    `;
    
    // 기존 모달 제거
    const existingModal = document.getElementById('progressUpdateModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('progressUpdateModal').style.display = 'flex';
    
    // 진행률 슬라이더 이벤트 리스너 추가
    setupProgressSliders();
}

function closeProgressUpdateModal() {
    const modal = document.getElementById('progressUpdateModal');
    if (modal) {
        modal.remove();
    }
}

function setupProgressSliders() {
    const sliders = document.querySelectorAll('.progress-slider');
    sliders.forEach(slider => {
        slider.addEventListener('input', (e) => {
            const stepId = e.target.dataset.stepId;
            const value = e.target.value;
            const valueDisplay = e.target.parentElement.querySelector('.progress-value');
            valueDisplay.textContent = `${value}%`;
            
            // 진행률에 따라 상태 자동 업데이트
            const statusSelect = document.querySelector(`select[data-step-id="${stepId}"]`);
            if (value == 0) {
                statusSelect.value = 'pending';
            } else if (value == 100) {
                statusSelect.value = 'completed';
            } else {
                statusSelect.value = 'in-progress';
            }
        });
    });
}

function markAllCompleted() {
    const statusSelects = document.querySelectorAll('.status-select, .status-select-compact');
    const progressSliders = document.querySelectorAll('.progress-slider');
    const progressPercents = document.querySelectorAll('.progress-percent');
    
    statusSelects.forEach(select => {
        select.value = 'completed';
    });
    
    progressSliders.forEach(slider => {
        slider.value = 100;
        slider.parentElement.querySelector('.progress-value').textContent = '100%';
    });
    
    progressPercents.forEach(percent => {
        percent.textContent = '100%';
    });
}

function resetAllProgress() {
    const statusSelects = document.querySelectorAll('.status-select, .status-select-compact');
    const progressSliders = document.querySelectorAll('.progress-slider');
    const progressPercents = document.querySelectorAll('.progress-percent');
    
    statusSelects.forEach(select => {
        select.value = 'pending';
    });
    
    progressSliders.forEach(slider => {
        slider.value = 0;
        slider.parentElement.querySelector('.progress-value').textContent = '0%';
    });
    
    progressPercents.forEach(percent => {
        percent.textContent = '0%';
    });
}

function markSequentialProgress() {
    const statusSelects = document.querySelectorAll('.status-select');
    const progressSliders = document.querySelectorAll('.progress-slider');
    
    // 순차적으로 완료 상태로 설정 (첫 번째부터 차례대로)
    statusSelects.forEach((select, index) => {
        if (index === 0) {
            select.value = 'completed';
            progressSliders[index].value = 100;
            progressSliders[index].parentElement.querySelector('.progress-value').textContent = '100%';
        } else if (index === 1) {
            select.value = 'in-progress';
            progressSliders[index].value = 50;
            progressSliders[index].parentElement.querySelector('.progress-value').textContent = '50%';
        } else {
            select.value = 'pending';
            progressSliders[index].value = 0;
            progressSliders[index].parentElement.querySelector('.progress-value').textContent = '0%';
        }
    });
}

function saveProgressUpdates() {
    // 간소화된 버전과 일반 버전 모두 지원
    const statusSelects = document.querySelectorAll('.status-select, .status-select-compact');
    
    statusSelects.forEach((select) => {
        const stepId = parseInt(select.dataset.stepId);
        const stepIndex = circularWorkflow.findIndex(s => s.id === stepId);
        
        if (stepIndex !== -1) {
            circularWorkflow[stepIndex].status = select.value;
            // 간소화된 버전에서는 상태에 따라 자동으로 진행률 설정
            if (select.value === 'completed') {
                circularWorkflow[stepIndex].progress = 100;
            } else if (select.value === 'in-progress') {
                circularWorkflow[stepIndex].progress = circularWorkflow[stepIndex].progress || 50;
            } else {
                circularWorkflow[stepIndex].progress = 0;
            }
        }
    });
    
    saveData();
    renderCircularWorkflow();
    closeProgressUpdateModal();
    showNotification('모든 진행 상황이 업데이트되었습니다.');
}

function getStatusText(status) {
    const statusTexts = {
        'pending': '대기',
        'in-progress': '진행중',
        'completed': '완료'
    };
    return statusTexts[status] || '대기';
}

// === 유틸리티 함수들 ===
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
}

// 날짜를 YYYY-MM-DD 형식으로 변환 (시간대 고려)
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatCurrency(amount) {
    return amount.toLocaleString('ko-KR') + '원';
}

// 입력 필드용 금액 포맷 함수
function formatCurrencyForInput(amount) {
    if (!amount || amount === 0) return '0원';
    return amount.toLocaleString('ko-KR') + '원';
}

// 입력값에서 숫자만 추출하는 함수
function parseNumberFromCurrency(value) {
    if (!value) return 0;
    return parseInt(value.replace(/[^0-9]/g, '')) || 0;
}

// 예산 입력 필드 포맷팅 설정
function setupBudgetInputFormatting() {
    const estimatedInput = document.getElementById('budgetEstimated');
    const usedInput = document.getElementById('budgetUsed');
    
    function formatInputValue(input) {
        const value = parseNumberFromCurrency(input.value);
        input.value = formatCurrencyForInput(value);
    }
    
    function handleInput(e) {
        const input = e.target;
        const cursorPosition = input.selectionStart;
        const oldValue = input.value;
        
        // 숫자만 추출
        const numericValue = parseNumberFromCurrency(input.value);
        const formattedValue = formatCurrencyForInput(numericValue);
        
        // 값이 변경된 경우에만 업데이트
        if (oldValue !== formattedValue) {
            input.value = formattedValue;
            
            // 커서 위치 조정 (대략적)
            const newPosition = Math.min(cursorPosition, formattedValue.length - 1);
            input.setSelectionRange(newPosition, newPosition);
        }
    }
    
    function handleFocus(e) {
        // 포커스 시 숫자만 선택 (원 제외)
        const input = e.target;
        setTimeout(() => {
            const value = input.value;
            if (value.endsWith('원')) {
                input.setSelectionRange(0, value.length - 1);
            }
        }, 0);
    }
    
    if (estimatedInput) {
        estimatedInput.removeEventListener('input', handleInput);
        estimatedInput.removeEventListener('focus', handleFocus);
        estimatedInput.addEventListener('input', handleInput);
        estimatedInput.addEventListener('focus', handleFocus);
    }
    
    if (usedInput) {
        usedInput.removeEventListener('input', handleInput);
        usedInput.removeEventListener('focus', handleFocus);
        usedInput.addEventListener('input', handleInput);
        usedInput.addEventListener('focus', handleFocus);
    }
}

function calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function closeAllModals() {
    // 정적 모달들 닫기
    const modals = [
        'scheduleModal',
        'budgetModal', 
        'workflowModal',
        'memoModal',
        'scheduleDetailModal',
        'confirmModal'
    ];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    });
    
    // 일정 상세보기 모달의 편집 모드 초기화
    const scheduleDetailEditMode = document.getElementById('scheduleDetailEditMode');
    const scheduleDetailViewMode = document.getElementById('scheduleDetailViewMode');
    const scheduleDetailModalTitle = document.getElementById('scheduleDetailModalTitle');
    
    if (scheduleDetailEditMode && scheduleDetailEditMode.style.display !== 'none') {
        scheduleDetailEditMode.style.display = 'none';
        scheduleDetailViewMode.style.display = 'block';
        scheduleDetailModalTitle.textContent = '일정 상세보기';
    }
    
    // 동적으로 생성된 모달들 닫기
    const dynamicModals = [
        'workflowStepModal',
        'workflowDetailsModal',
        'contractorsModal',
        'progressUpdateModal',
        'imageModal'
    ];
    
    dynamicModals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.remove(); // 동적 모달은 완전히 제거
        }
    });
    
    // 전역 변수 초기화
    currentEditingId = null;
    selectedSchedule = null;
}

// 모든 데이터 렌더링
function renderAll() {
    // renderSchedules(); // Firebase 리스너에서 자동 호출됨
    renderBudgets();
    renderTimelineWorkflow();
    renderMemos();
    updateTabCounts();
}

// 알림 메시지 표시
function showNotification(message, type = 'info') {
    // 기존 알림이 있으면 제거
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 새 알림 생성
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // 페이지에 추가
    document.body.appendChild(notification);
    
    // 애니메이션
    setTimeout(() => notification.classList.add('show'), 100);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', init);

// 샘플 데이터 추가 함수 (개발용)
function addSampleData() {
    // 샘플 예산
    budgets.push({
        id: Date.now() + 1,
        category: '자재비',
        estimated: 4000000,
        used: 2000000,
        note: '바닥재, 벽지, 페인트 등'
    });
    
    budgets.push({
        id: Date.now() + 2,
        category: '인건비',
        estimated: 3000000,
        used: 1500000,
        note: '목수, 전기기사, 배관공'
    });
    
    // 샘플 메모
    memos.push({
        id: Date.now() + 3,
        title: '전기 작업 주의사항',
        content: '220V 콘센트 추가 설치 필요\n배선 점검 완료\n안전차단기 확인 필수',
        category: '중요',
        completed: false,
        createdAt: new Date().toISOString()
    });
    
    saveData();
    renderAll();
}

// === 검색 및 필터링 함수들 ===

// 현재 탭에서만 검색
function handleGlobalSearch(e) {
    const query = e.target.value.trim();
    searchFilters.global = query;
    
    // 현재 활성화된 탭 확인
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    
    if (query.length > 0) {
        elements.clearSearch.style.display = 'block';
        
        // 현재 탭에서만 검색 수행
        performSearch(activeTab, query);
        
        // 검색 결과 개수 확인 및 알림
        const resultCount = getSearchResultCount(activeTab, query);
        if (resultCount > 0) {
            showNotification(`'${query}' 검색 결과: ${resultCount}개 항목 발견`, 'info');
        } else {
            showNotification(`'${query}'에 대한 검색 결과가 없습니다.`, 'warning');
        }
    } else {
        elements.clearSearch.style.display = 'none';
        // 빈 검색어일 때는 현재 탭의 검색만 초기화
        performSearch(activeTab, '');
    }
}

// 특정 탭에서 검색 결과 개수 반환
function getSearchResultCount(section, query) {
    if (!query || query.length === 0) return 0;
    
    const searchQuery = query.toLowerCase();
    
    switch (section) {
        case 'schedule':
            return schedules.filter(schedule => 
                schedule.title.toLowerCase().includes(searchQuery) ||
                (schedule.description && schedule.description.toLowerCase().includes(searchQuery))
            ).length;
            
        case 'workflow':
            return circularWorkflow.filter(item => 
                item.name.toLowerCase().includes(searchQuery) ||
                (item.details && item.details.toLowerCase().includes(searchQuery))
            ).length;
            
        case 'memo':
            return memos.filter(memo => 
                memo.title.toLowerCase().includes(searchQuery) ||
                memo.content.toLowerCase().includes(searchQuery)
            ).length;
            
        case 'budget':
            return budgets.filter(budget => 
                budget.category.toLowerCase().includes(searchQuery) ||
                (budget.note && budget.note.toLowerCase().includes(searchQuery))
            ).length;
            
        case 'important':
            // 중요사항은 정적 콘텐츠이므로 하드코딩된 검색
            const importantItems = [
                '시공 시 계약 확인',
                '시공시 각각 문자로 최종계약내용 정리해서 보내고 확답받기',
                '폐기물처리 및 철거비용 확인',
                '각각 업체 계약할때 폐기물처리 + 철거비용 포함 되어있는지 확인'
            ];
            return importantItems.filter(item => 
                item.toLowerCase().includes(searchQuery)
            ).length;
            
        default:
            return 0;
    }
}

// 글로벌 검색 클리어
function clearGlobalSearch() {
    elements.globalSearch.value = '';
    searchFilters.global = '';
    elements.clearSearch.style.display = 'none';
    
    // 현재 활성화된 탭만 확인하여 해당 탭만 클리어
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    
    // 현재 탭의 필터만 초기화
    switch (activeTab) {
        case 'schedule':
            searchFilters.schedule.text = '';
            if (elements.scheduleSearch) elements.scheduleSearch.value = '';
            renderSchedules();
            if (currentView === 'calendar') {
                renderCalendar();
            }
            break;
        case 'workflow':
            searchFilters.workflow = '';
            renderCircularWorkflow();
            break;
        case 'budget':
            searchFilters.budget.text = '';
            if (elements.budgetSearch) elements.budgetSearch.value = '';
            renderBudgets();
            break;
        case 'memo':
            searchFilters.memo.text = '';
            if (elements.memoSearch) elements.memoSearch.value = '';
            renderMemos();
            break;
        case 'important':
            // 중요사항은 정적 콘텐츠이므로 별도 처리 없음
            break;
    }
    
    updateTabCounts();
}

// 통합 검색 실행
function performSearch(section, query) {
    switch (section) {
        case 'schedule':
            searchFilters.schedule.text = query;
            if (elements.scheduleSearch) elements.scheduleSearch.value = query;
            renderSchedules();
            renderCalendar();
            break;
        case 'workflow':
            // 워크플로우 검색어 설정 및 렌더링
            searchFilters.workflow = query;
            renderCircularWorkflow();
            break;
        case 'budget':
            searchFilters.budget.text = query;
            if (elements.budgetSearch) elements.budgetSearch.value = query;
            renderBudgets();
            break;
        case 'memo':
            searchFilters.memo.text = query;
            if (elements.memoSearch) elements.memoSearch.value = query;
            renderMemos();
            break;
        case 'important':
            // 중요사항은 검색 기능이 없으므로 패스
            break;
    }
}

// 스케줄 검색
function handleScheduleSearch(e) {
    searchFilters.schedule.text = e.target.value.trim();
    renderSchedules();
    renderCalendar();
}

// 스케줄 필터
function handleScheduleFilter(e) {
    searchFilters.schedule.status = e.target.value;
    renderSchedules();
    renderCalendar();
}

// 예산 검색
function handleBudgetSearch(e) {
    searchFilters.budget.text = e.target.value.trim();
    renderBudgets();
}

// 예산 정렬
function handleBudgetSort(e) {
    searchFilters.budget.sort = e.target.value;
    renderBudgets();
}

// 메모 검색
function handleMemoSearch(e) {
    searchFilters.memo.text = e.target.value.trim();
    renderMemos();
}

// 메모 카테고리 필터
function handleMemoFilter(e) {
    searchFilters.memo.category = e.target.value;
    renderMemos();
}

// 메모 정렬
function handleMemoSort(e) {
    searchFilters.memo.sort = e.target.value;
    renderMemos();
}

// 텍스트 하이라이트
function highlightText(text, query) {
    if (!query || query.length < 2) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// 데이터 필터링 함수들
function getFilteredSchedules() {
    let filtered = [...schedules];
    
    // 텍스트 검색
    if (searchFilters.schedule.text) {
        const query = searchFilters.schedule.text.toLowerCase();
        filtered = filtered.filter(schedule => 
            schedule.title.toLowerCase().includes(query) ||
            (schedule.description && schedule.description.toLowerCase().includes(query))
        );
    }
    
    // 상태 필터
    if (searchFilters.schedule.status) {
        filtered = filtered.filter(schedule => 
            schedule.status === searchFilters.schedule.status
        );
    }
    
    return filtered;
}

function getFilteredBudgets() {
    let filtered = [...budgets];
    
    // 텍스트 검색
    if (searchFilters.budget.text) {
        const query = searchFilters.budget.text.toLowerCase();
        filtered = filtered.filter(budget => 
            budget.category.toLowerCase().includes(query) ||
            (budget.note && budget.note.toLowerCase().includes(query))
        );
    }
    
    // 정렬
    switch (searchFilters.budget.sort) {
        case 'used':
            filtered.sort((a, b) => b.used - a.used);
            break;
        case 'category':
        default:
            filtered.sort((a, b) => a.category.localeCompare(b.category));
    }
    
    return filtered;
}

function getFilteredMemos() {
    let filtered = [...memos];
    
    // 텍스트 검색
    if (searchFilters.memo.text) {
        const query = searchFilters.memo.text.toLowerCase();
        filtered = filtered.filter(memo => 
            memo.title.toLowerCase().includes(query) ||
            memo.content.toLowerCase().includes(query)
        );
    }
    

    
    // 정렬
    switch (searchFilters.memo.sort) {
        case 'title':
            filtered.sort((a, b) => a.title.localeCompare(b.title));
            break;
        default:
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    return filtered;
}

// 카운트 업데이트
function updateTabCounts() {
    if (elements.scheduleCount) {
        elements.scheduleCount.textContent = schedules.length;
    }
    if (elements.budgetCount) {
        elements.budgetCount.textContent = budgets.length;
    }
    if (elements.memoCount) {
        elements.memoCount.textContent = memos.length;
    }
}

// === 터치 제스처 및 모바일 최적화 ===

function setupTouchGestures() {
    // 탭 간 스와이프 제스처
    let touchStartX = 0;
    let touchEndX = 0;
    const container = document.querySelector('.container');
    
    if (container) {
        container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        container.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
    }
    
    function handleSwipe() {
        const swipeThreshold = 100;
        const swipeDistance = touchEndX - touchStartX;
        
        if (Math.abs(swipeDistance) < swipeThreshold) return;
        
        const tabs = ['schedule', 'workflow', 'budget', 'memo'];
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        const currentIndex = tabs.indexOf(activeTab);
        
        if (swipeDistance > 0 && currentIndex > 0) {
            // 오른쪽 스와이프 - 이전 탭
            switchTab(tabs[currentIndex - 1]);
        } else if (swipeDistance < 0 && currentIndex < tabs.length - 1) {
            // 왼쪽 스와이프 - 다음 탭
            switchTab(tabs[currentIndex + 1]);
        }
    }
    
    // 드래그 앤 드롭 터치 지원 강화
    document.addEventListener('touchmove', function(e) {
        if (e.target.closest('.draggable')) {
            e.preventDefault();
        }
    }, { passive: false });
}

// 로딩 상태 표시
function showLoading() {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(loadingOverlay);
    
    setTimeout(() => {
        if (loadingOverlay.parentNode) {
            loadingOverlay.parentNode.removeChild(loadingOverlay);
        }
    }, 500);
}

// 빈 상태 메시지 생성
function createEmptyState(icon, title, message) {
    return `
        <div class="empty-state">
            <i class="fas fa-${icon}"></i>
            <h3>${title}</h3>
            <p>${message}</p>
        </div>
    `;
}

// 드래그 앤 드롭 개선
function enhanceDragAndDrop() {
    const draggableElements = document.querySelectorAll('.draggable');
    
    draggableElements.forEach(element => {
        element.addEventListener('dragstart', function(e) {
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        
        element.addEventListener('dragend', function(e) {
            this.classList.remove('dragging');
            document.querySelectorAll('.drag-over').forEach(el => {
                el.classList.remove('drag-over');
            });
        });
    });
}

// 즉석에서 확인되지 않은 함수들 선언 (DOM 로딩 후 호출하려고)
document.addEventListener('DOMContentLoaded', function() {
    updateTabCounts();
    enhanceDragAndDrop();
});

// === 타임라인 워크플로우 관리 함수들 ===
function renderTimelineWorkflow() {
    // 각 타임라인 단계 업데이트
    circularWorkflow.forEach(step => {
        const stepElement = document.querySelector(`.timeline-step[data-step="${step.id}"]`);
        if (stepElement) {
            // 상태 업데이트
            stepElement.setAttribute('data-status', step.status);
            
            // 아이콘 업데이트
            const iconElement = stepElement.querySelector('.step-icon i');
            if (iconElement) {
                iconElement.className = `fas fa-${step.icon}`;
            }
            
            // 상태 배지 업데이트
            const statusBadge = stepElement.querySelector('.step-status-badge');
            if (statusBadge) {
                statusBadge.setAttribute('data-status', step.status);
                statusBadge.textContent = getStatusText(step.status);
            }
            
            // 설명 업데이트 (세부 내용이 있는 경우)
            const description = stepElement.querySelector('.step-description');
            if (description && step.details && step.details.trim()) {
                const shortDescription = step.details.length > 50 
                    ? step.details.substring(0, 50) + '...' 
                    : step.details;
                description.textContent = shortDescription;
            }
        }
    });
    
    // 전체 진행률 및 통계 업데이트
    updateTimelineStats();
}

function updateTimelineStats() {
    const completedSteps = circularWorkflow.filter(step => step.status === 'completed').length;
    const inProgressSteps = circularWorkflow.filter(step => step.status === 'in-progress').length;
    const pendingSteps = circularWorkflow.filter(step => step.status === 'pending').length;
    const progressPercentage = Math.round((completedSteps / circularWorkflow.length) * 100);
    
    // 전체 진행률 업데이트
    const progressElement = document.getElementById('overallProgress');
    if (progressElement) {
        progressElement.textContent = `${progressPercentage}%`;
    }
    
    // 통계 업데이트
    const completedElement = document.getElementById('completedSteps');
    const inProgressElement = document.getElementById('inProgressSteps');
    const pendingElement = document.getElementById('pendingSteps');
    
    if (completedElement) completedElement.textContent = completedSteps;
    if (inProgressElement) inProgressElement.textContent = inProgressSteps;
    if (pendingElement) pendingElement.textContent = pendingSteps;
}

// === 이미지 업로드 관련 함수들 ===

// 이미지 업로드 함수
async function uploadImage(file, stepId) {
    try {
        console.log('🔥 이미지 업로드 시작:', file.name, 'stepId:', stepId);
        console.log('파일 정보:', {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
        });
        
        const timestamp = Date.now();
        
        // 파일명에서 특수문자 제거 (CORS 문제 해결을 위해)
        const sanitizedName = file.name
            .replace(/[^a-zA-Z0-9._-]/g, '_')  // 특수문자, 공백, 한글 등을 _로 치환
            .replace(/_{2,}/g, '_')             // 연속된 _를 하나로 치환
            .replace(/^_+|_+$/g, '')           // 앞뒤 _제거
            .substring(0, 50);                 // 길이 제한
        
        const filename = `workflow_${stepId}_${timestamp}_${sanitizedName}`;
        
        const fileRef = storage.ref(`workflow-images/${filename}`);
        
        // 업로드 메타데이터 설정
        const metadata = {
            contentType: file.type,
            cacheControl: 'public,max-age=3600',
            customMetadata: {
                'stepId': stepId.toString(),
                'originalName': file.name,
                'uploadedAt': new Date().toISOString()
            }
        };
        
        // 이미지 업로드
        const snapshot = await fileRef.put(file, metadata);
        
        // 다운로드 URL 가져오기
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        return {
            url: downloadURL,
            filename: filename,
            originalName: file.name,
            uploadedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('❌ 이미지 업로드 중 오류:', error);
        console.error('오류 코드:', error.code);
        console.error('오류 메시지:', error.message);
        console.error('오류 상세:', error.serverResponse);
        
        // CORS 및 권한 문제 감지
        if (error.code === 'storage/unauthorized') {
            console.error('🚨 Firebase Storage 권한 오류! 보안 규칙을 확인하세요.');
            showNotification('Firebase Storage 보안 규칙을 설정해주세요.', 'error');
        } else if (error.message && error.message.includes('CORS')) {
            console.error('🚨 CORS 오류 발생! Firebase Storage CORS 설정을 확인하세요.');
            showNotification('CORS 설정 문제입니다. Firebase Console에서 설정해주세요.', 'error');
        } else if (error.code === 'storage/unknown') {
            console.error('🚨 알 수 없는 Storage 오류. 네트워크 또는 권한 문제일 수 있습니다.');
            showNotification('Storage 접근 권한 문제입니다. Firebase 설정을 확인해주세요.', 'error');
        }
        
        throw error;
    }
}

// 이미지 삭제 함수
async function deleteImage(imageData) {
    try {
        const storageRef = storage.ref(`workflow-images/${imageData.filename}`);
        await storageRef.delete();
        return true;
    } catch (error) {
        console.error('이미지 삭제 중 오류:', error);
        return false;
    }
}

// 이미지 미리보기 생성 함수
function createImagePreview(imageData, stepId, imageIndex) {
    return `
        <div class="image-preview" data-step-id="${stepId}" data-image-index="${imageIndex}">
            <img src="${imageData.url}" alt="${imageData.originalName}" onclick="openImageModal('${imageData.url}', '${imageData.originalName}')">
            <div class="image-overlay">
                <div class="image-actions">
                    <button type="button" class="btn-image-delete" onclick="removeWorkflowImage(${stepId}, ${imageIndex})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="image-info">
                <span class="image-name">${imageData.originalName}</span>
                <span class="image-date">${formatDate(imageData.uploadedAt)}</span>
            </div>
        </div>
    `;
}

// 이미지 모달 열기 함수
function openImageModal(imageUrl, imageName) {
    const modalHTML = `
        <div id="imageModal" class="modal image-modal">
            <div class="modal-content image-modal-content">
                <div class="modal-header">
                    <h3>${imageName}</h3>
                    <span class="close" onclick="closeImageModal()">&times;</span>
                </div>
                <div class="modal-body image-modal-body">
                    <img src="${imageUrl}" alt="${imageName}" class="modal-image">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-primary" onclick="window.open('${imageUrl}', '_blank')">
                        <i class="fas fa-external-link-alt"></i> 원본 크기로 보기
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // 기존 모달 제거
    const existingModal = document.getElementById('imageModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('imageModal').style.display = 'flex';
}

// 이미지 모달 닫기 함수
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.remove();
    }
}

// 워크플로우 이미지 추가 함수
async function addWorkflowImage(stepId) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    
    fileInput.onchange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        const stepIndex = circularWorkflow.findIndex(s => s.id === stepId);
        if (stepIndex === -1) return;
        
        try {
            // 로딩 표시
            showNotification('이미지 업로드 중...', 'info');
            
            // images 배열이 없으면 초기화
            if (!circularWorkflow[stepIndex].images) {
                circularWorkflow[stepIndex].images = [];
            }
            
            for (const file of files) {
                // 파일 크기 체크 (5MB 제한)
                if (file.size > 5 * 1024 * 1024) {
                    showNotification(`${file.name}은 5MB를 초과합니다.`, 'warning');
                    continue;
                }
                
                const imageData = await uploadImage(file, stepId);
                circularWorkflow[stepIndex].images.push(imageData);
            }
            
            // 이미지 목록 업데이트
            renderWorkflowImages(stepId);
            
            // Firebase에 저장 - 확실히 저장되도록 강제 (재시도 로직 포함)
            let saveSuccess = false;
            let retryCount = 0;
            const maxRetries = 3;
            
            while (!saveSuccess && retryCount < maxRetries) {
                try {
                    await saveWorkflowToFirebase();
                    saveSuccess = true;
                } catch (error) {
                    retryCount++;
                    console.error(`Firebase 저장 실패 (시도 ${retryCount}/${maxRetries}):`, error);
                    if (retryCount < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                    } else {
                        throw error;
                    }
                }
            }
            
            showNotification('이미지가 성공적으로 업로드되었습니다.', 'success');
        } catch (error) {
            console.error('이미지 업로드 중 오류:', error);
            showNotification('이미지 업로드 중 오류가 발생했습니다.', 'error');
        }
    };
    
    fileInput.click();
}

// 워크플로우 이미지 삭제 함수
async function removeWorkflowImage(stepId, imageIndex) {
    const stepIndex = circularWorkflow.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return;
    
    const imageData = circularWorkflow[stepIndex].images[imageIndex];
    if (!imageData) return;
    
    const confirmed = await customConfirm('이 이미지를 삭제하시겠습니까?');
    if (!confirmed) return;
    
    try {
        // Firebase Storage에서 이미지 삭제
        await deleteImage(imageData);
        
        // 배열에서 이미지 제거
        circularWorkflow[stepIndex].images.splice(imageIndex, 1);
        
        // 이미지 목록 업데이트
        renderWorkflowImages(stepId);
        
        // Firebase에 저장
        await saveWorkflowToFirebase();
        
        showNotification('이미지가 삭제되었습니다.', 'success');
    } catch (error) {
        console.error('이미지 삭제 중 오류:', error);
        showNotification('이미지 삭제 중 오류가 발생했습니다.', 'error');
    }
}

// 워크플로우 이미지 목록 렌더링 함수
function renderWorkflowImages(stepId) {
    const stepIndex = circularWorkflow.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return;
    
    const step = circularWorkflow[stepIndex];
    const imagesContainer = document.getElementById(`images-${stepId}`);
    
    if (!imagesContainer) return;
    
    if (!step.images || step.images.length === 0) {
        imagesContainer.innerHTML = '<p class="no-images">업로드된 이미지가 없습니다.</p>';
        return;
    }
    
    imagesContainer.innerHTML = step.images.map((imageData, index) => 
        createImagePreview(imageData, stepId, index)
    ).join('');
}

// === 날짜별 일정 목록 모달 ===
function openDaySchedulesModal(date, schedulesForDate) {
    const dateLabel = formatDate(date);
    const modalHTML = `
        <div id="daySchedulesModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${dateLabel} 일정 목록</h3>
                    <span class="close" onclick="closeDaySchedulesModal()">&times;</span>
                </div>
                <div class="modal-body">
                    ${schedulesForDate.map(s => `
                        <div class="schedule-item" onclick="(function(){closeDaySchedulesModal();openScheduleDetailModal(${JSON.stringify(s).replace(/"/g, '&quot;')});})()">
                            <span class="status-badge ${s.status || 'pending'}">${getStatusText(s.status)}</span>
                            <span class="item-title">${s.title}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="closeDaySchedulesModal()">닫기</button>
                    <button type="button" class="btn-primary" onclick="(function(){closeDaySchedulesModal();openScheduleModal(null, '${formatDateForInput(date)}');})();">새 일정 추가</button>
                </div>
            </div>
        </div>`;
    // 중복 방지
    const existing = document.getElementById('daySchedulesModal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('daySchedulesModal').style.display = 'flex';
}
function closeDaySchedulesModal() {
    const modal = document.getElementById('daySchedulesModal');
    if (modal) modal.remove();
}