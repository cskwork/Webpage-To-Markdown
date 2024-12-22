
// MarkdownConverter 클래스 정의
class MarkdownConverter {
    // 생성자: TurndownService 초기화 및 이벤트 리스너 설정
    constructor() {
        // TurndownService 인스턴스 생성
        // 마크다운 변환 옵션 설정: 헤딩 스타일, 수평 줄, 글머리 기호, 코드 블록 스타일, 강조 구문
        this.turndownService = new TurndownService({
            headingStyle: 'atx',       // 헤딩 스타일을 atx (#, ##, ###) 스타일로 설정
            hr: '---',                 // 수평 줄을 --- 로 설정
            bulletListMarker: '-',      // 글머리 기호를 - 로 설정
            codeBlockStyle: 'fenced',   // 코드 블록 스타일을 fenced (```) 스타일로 설정
            emDelimiter: '_'           // 강조 구문을 _ 로 설정 (예: _강조_)
        });
        
        // Turndown 규칙 설정 함수 호출
        this.setupTurndownRules();
        // 이벤트 리스너 초기화 함수 호출
        this.initializeEventListeners();
    }

    // Turndown 규칙 설정
    setupTurndownRules() {
        // 'iframe', 'script', 'style' 태그는 HTML로 유지하도록 설정
        this.turndownService.keep(['iframe', 'script', 'style']);
        
        // 'figure' 태그에 대한 사용자 정의 규칙 추가
        this.turndownService.addRule('figures', {
            filter: 'figure', // 'figure' 태그를 필터링
            replacement: (content, node) => { // 'figure' 태그를 마크다운으로 변환하는 함수
                // 'figure' 태그 내의 'img' 태그와 'figcaption' 태그 찾기
                const img = node.querySelector('img');
                const caption = node.querySelector('figcaption');
                // 'img' 태그가 있으면
                if (img) {
                    // 'img' 태그의 'alt', 'src' 속성과 'figcaption' 태그의 텍스트 가져오기
                    const alt = img.getAttribute('alt') || '';
                    const src = img.getAttribute('src') || '';
                    const captionText = caption ? caption.textContent : '';
                    // 이미지 마크다운과 캡션 텍스트 반환
                    return `\n\n![${alt}](${src})\n${captionText}\n\n`;
                }
                // 'img' 태그가 없으면 원래 콘텐츠 반환
                return content;
            }
        });
    }

    // 이벤트 리스너 초기화
    initializeEventListeners() {
        // 'convert' 버튼 클릭 시 convertPage 함수 실행
        document.getElementById('convert').addEventListener('click', () => this.convertPage());
        // 'copy' 버튼 클릭 시 copyToClipboard 함수 실행
        document.getElementById('copy').addEventListener('click', () => this.copyToClipboard());
        // 'download' 버튼 클릭 시 downloadMarkdown 함수 실행
        document.getElementById('download').addEventListener('click', () => this.downloadMarkdown());
    }

    // 페이지 변환 함수
    async convertPage() {
        try {
            // 상태 메시지를 'Converting...'으로 업데이트
            this.updateStatus('Converting...', 'info');
            
            // 현재 활성 탭 가져오기
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            // 활성 탭이 없거나 탭 ID가 없으면 에러 발생
            if (!tab || !tab.id) {
                throw new Error('No active tab found');
            }
    
            // 콘텐츠 스크립트 실행
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    // 이 함수는 웹 페이지의 컨텍스트에서 실행됨
                    try {
                        // iframe 콘텐츠를 가져오는 도우미 함수
                        const getIframeContent = (iframe) => {
                            try {
                                // iframe 콘텐츠에 접근할 수 있는지 확인
                                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                                if (!iframeDoc) return '';
    
                                // 원본을 수정하지 않도록 iframe 문서를 복제
                                const iframeClone = iframeDoc.body.cloneNode(true);
                                
                                // iframe 콘텐츠에서 불필요한 요소 제거
                                const unwantedInIframe = iframeClone.querySelectorAll(
                                    'script, style, nav, footer, aside, .ads, .comments'
                                );
                                unwantedInIframe.forEach(el => el.remove());
    
                                return `<div class="iframe-content">${iframeClone.innerHTML}</div>`;
                            } catch (e) {
                                console.warn('Could not access iframe content:', e);
                                return '';
                            }
                        };
    
                        // 작업할 문서의 복사본 생성
                        const documentClone = document.cloneNode(true);
                        
                        // iframe을 제거하기 전에 모든 iframe 가져오기
                        const iframes = documentClone.querySelectorAll('iframe');
                        let iframeContents = [];
    
                        // iframe 콘텐츠 수집
                        iframes.forEach((iframe, index) => {
                            const originalIframe = document.querySelectorAll('iframe')[index];
                            const content = getIframeContent(originalIframe);
                            if (content) {
                                iframeContents.push(content);
                            }
                        });
                        
                        // 불필요한 요소 제거 (iframe은 위에서 처리했으므로 제외)
                        const unwanted = documentClone.querySelectorAll(
                            'script, style, nav, footer, aside, .ads, .comments, [role="complementary"]'
                        );
                        unwanted.forEach(el => el.remove());
    
                        // 주요 콘텐츠 찾기 시도
                        const mainContent = documentClone.querySelector(
                            'main, article, .content, .post, .entry, [role="main"]'
                        );
    
                        // 콘텐츠 준비
                        let finalContent;
                        if (mainContent) {
                            finalContent = mainContent.innerHTML;
                        } else {
                            finalContent = document.body.innerHTML;
                        }
    
                        // 주요 콘텐츠 끝에 iframe 콘텐츠 추가
                        if (iframeContents.length > 0) {
                            finalContent += '<h2>Embedded Content</h2>';
                            finalContent += iframeContents.join('<hr>');
                        }
    
                        return {
                            title: document.title, // 페이지 제목
                            content: finalContent, // 변환할 콘텐츠
                            success: true // 성공 여부
                        };
                    } catch (error) {
                        return {
                            success: false, // 성공 여부
                            error: error.message // 에러 메시지
                        };
                    }
                }
            });
    
            // 결과가 없거나, 결과 배열의 첫 번째 요소가 없거나, 결과에 'result' 속성이 없으면 에러 발생
            if (!results || !results[0] || !results[0].result) {
                throw new Error('Failed to get page content');
            }
    
            // 결과에서 성공 여부, 콘텐츠, 제목, 에러 메시지 추출
            const { success, content, title, error } = results[0].result;
    
            // 콘텐츠 추출에 실패한 경우 에러 발생
            if (!success) {
                throw new Error(`Failed to extract content: ${error}`);
            }
    
            // 콘텐츠를 div 태그로 감싸기
            const wrappedContent = `
                <div class="markdown-content">
                    <h1>${title}</h1>
                    ${content}
                </div>
            `;
    
            // TurndownService를 사용하여 HTML을 마크다운으로 변환
            const markdown = this.turndownService.turndown(wrappedContent);
            // 'output' 텍스트 영역에 마크다운 출력
            const output = document.getElementById('output');
            output.value = markdown;
    
            // 'copy' 및 'download' 버튼 활성화
            document.getElementById('copy').disabled = false;
            document.getElementById('download').disabled = false;
            
            // 상태 메시지를 'Conversion complete!'로 업데이트
            this.updateStatus('Conversion complete!', 'success');
            
            // 마지막 변환 결과 (URL, 마크다운, 타임스탬프)를 로컬 스토리지에 저장
            await chrome.storage.local.set({ 
                lastConversion: {
                    url: tab.url,
                    markdown: markdown,
                    timestamp: new Date().toISOString()
                }
            });

            const copyButton = document.getElementById('copy');
            const downloadButton = document.getElementById('download');
            copyButton.classList.add('secondaryEnabled');
            downloadButton.classList.add('secondaryEnabled');

        } catch (error) {
            // 에러 발생 시 에러 메시지 출력 및 상태 메시지 업데이트
            console.error('Conversion error:', error);
            this.updateStatus(`Error: ${error.message}`, 'error');
            
            // 'output' 텍스트 영역 비우기 및 'copy', 'download' 버튼 비활성화
            document.getElementById('output').value = '';
            document.getElementById('copy').disabled = true;
            document.getElementById('download').disabled = true;
        }
    }

    // 클립보드에 복사하는 함수
    async copyToClipboard() {
        // 'output' 텍스트 영역의 값 가져오기
        const output = document.getElementById('output');
        try {
            // 텍스트를 클립보드에 복사
            await navigator.clipboard.writeText(output.value);
            // 상태 메시지를 'Copied to clipboard!'로 업데이트
            this.updateStatus('Copied to clipboard!', 'success');
        } catch (error) {
            // 에러 발생 시 에러 메시지 출력 및 상태 메시지 업데이트
            console.error('Copy error:', error);
            this.updateStatus('Error copying to clipboard', 'error');
        }
    }

    // 마크다운 파일 다운로드 함수
    downloadMarkdown() {
        try {
            // 'output' 텍스트 영역의 값 가져오기
            const output = document.getElementById('output');
            // 마크다운 텍스트를 Blob 객체로 생성
            const blob = new Blob([output.value], { type: 'text/markdown' });
            // Blob 객체의 URL 생성
            const url = URL.createObjectURL(blob);
            // 현재 시간을 ISO 형식으로 변환하고, ':'와 '.'을 '-'로 치환
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            // 다운로드 링크 생성
            const a = document.createElement('a');
            a.href = url;
            // 파일 이름 설정
            a.download = `webpage-${timestamp}.md`;
            // 링크 클릭
            a.click();
            
            // URL 객체 해제
            URL.revokeObjectURL(url);
            // 상태 메시지를 'Downloaded successfully!'로 업데이트
            this.updateStatus('Downloaded successfully!', 'success');
        } catch (error) {
            // 에러 발생 시 에러 메시지 출력 및 상태 메시지 업데이트
            console.error('Download error:', error);
            this.updateStatus('Error downloading file', 'error');
        }
    }

    // 상태 메시지 업데이트 함수
    updateStatus(message, type = 'info') {
        const button = document.getElementById('status');
        // 상태 메시지 설정




        // 'status' 요소 가져오기
        const status = document.getElementById('status');
        // 상태 메시지 설정
        status.textContent = message;
        // 상태 메시지 클래스 설정 (info, success, error)
        status.className = `status ${type}`;
        
        // 성공 또는 에러 메시지인 경우 3초 후에 상태 메시지 지우기
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                status.textContent = '';
                status.className = 'status';
            }, 3000);
        }
    }
}

// 팝업 로드 시 MarkdownConverter 인스턴스 생성
document.addEventListener('DOMContentLoaded', () => {
    new MarkdownConverter();
});