// 모바일 이미지 로딩 문제 및 확대 팝업 개선 패치
// (1) + 기호 등 특수문자가 포함된 로컬 이미지가 모바일 브라우저에서 로딩되지 않는 문제를 해결하기 위해
//     createImagePreview 함수를 재정의하여 URL 인코딩을 적용합니다.
// (2) 추가적으로, 이미지 클릭 시 확대 모달이 정상 작동하도록 동일한 인코딩 URL을 사용합니다.

(function () {
  // 원본 함수가 이미 선언된 이후에만 재정의되도록 확인
  if (typeof window.createImagePreview !== 'function') return;

  window.createImagePreview = function (imageData, stepId, imageIndex) {
    // "+" 기호를 포함한 파일명이 서버에서 공백 등으로 해석되어 404가 발생하는 것을 방지
    const encodedUrl = encodeURI(imageData.url).replace(/\+/g, '%2B');

    return `
      <div class="image-preview" data-step-id="${stepId}" data-image-index="${imageIndex}">
        <img src="${encodedUrl}" alt="${imageData.originalName}" onclick="openImageModal('${encodedUrl}', '${imageData.originalName}')">
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
  };
})();

// (3) 'OO 관리 모달이 열렸습니다.' 알림은 UX 관점상 불필요하므로 표시하지 않도록 필터링
(function(){
  if (typeof window.showNotification !== 'function') return;
  const _origNotify = window.showNotification;
  window.showNotification = function(message, type = 'info') {
    if (typeof message === 'string' && message.includes('관리 모달이 열렸습니다.')) {
      return; // 무시
    }
    _origNotify(message, type);
  };
})(); 