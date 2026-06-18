(async function () {
    // 1. Find the script tag that loaded this file
    const scriptTag = document.currentScript || document.querySelector('script[src*="widget.js"]');

    // 2. Get the ID from the data-id attribute
    const WEBSITE_ID = scriptTag ? scriptTag.getAttribute('data-id') : null;

    const baseUrl = scriptTag ? (scriptTag.getAttribute('data-base-url') || 'http://localhost:8080') : 'http://localhost:8080';
    const wsUrl = baseUrl.replace('http', 'ws');

    if (!WEBSITE_ID) {
        console.error("Chat Widget: Website ID is missing!");
        return; // Stop execution if no ID
    }

    try {
        const response = await fetch(`${baseUrl}/api/v1/client/chatbot/script/${WEBSITE_ID}`);
        if (!response.ok) {
            console.error("Chat Widget: Failed to verify widget status.");
            return;
        }
        const data = await response.json();
        if (!data.is_active) {
            return; // Stop execution if widget is not active
        }
    } catch (error) {
        console.error("Chat Widget: Error checking widget status:", error);
        return;
    }

    // const WEBSITE_ID = window.LC_WEBSITE_ID || 'd894d558-a671-473a-a1b6-a5b11176b8e5';
    let audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');

    // Inject CSS
    const style = document.createElement('style');
    style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    .lc-widget-bubble { position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 50%; box-shadow: 0 10px 25px rgba(59, 130, 246, 0.5); cursor: pointer; z-index: 9999; display: flex; align-items: center; justify-content: center; color: white; transition: all 0.3s; }
    .lc-widget-bubble:hover { transform: scale(1.1) translateY(-5px); }
    .lc-widget-bubble svg { width: 28px; height: 28px; fill: white; }
    .lc-badge { position: absolute; top: -4px; right: -4px; background: #ef4444; color: white; min-width: 20px; height: 20px; border-radius: 10px; font-size: 11px; display: flex; align-items: center; justify-content: center; font-weight: 700; padding: 0 5px; box-sizing: border-box; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
    
    .lc-widget-window { position: fixed; bottom: 100px; right: 20px; width: 380px; height: 600px; background: #fff; border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.2); z-index: 9999; display: none; flex-direction: column; overflow: hidden; font-family: 'Inter', sans-serif; border: 1px solid rgba(0,0,0,0.05); }
    .lc-widget-window.open { display: flex; }
    
    .lc-header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 10; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15); border-bottom: 1px solid rgba(255,255,255,0.1); }
    .lc-header-info { display: flex; align-items: center; gap: 12px; }
    .lc-header-text { display: flex; flex-direction: column; color: white; }
    .lc-header-title { font-weight: 700; font-size: 15px; letter-spacing: -0.1px; }
    .lc-header-subtitle { font-size: 11px; opacity: 0.85; font-weight: 500; display: flex; align-items: center; gap: 4px; line-height: 1; margin-top: 2px; }
    .lc-header-subtitle::before { content: ""; width: 6px; height: 6px; background: #4ade80; border-radius: 50%; display: inline-block; box-shadow: 0 0 8px #4ade80; }
    
    .lc-avatar-main { width: 36px; height: 36px; background: rgba(255,255,255,0.2); border-radius: 11px; display: flex; align-items: center; justify-content: center; color: white; position: relative; backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.1); }
    .lc-avatar-main svg { width: 22px; height: 22px; fill: white; }
    
    .lc-header-controls { display: flex; gap: 8px; align-items: center; }
    
    .lc-end-btn { display: flex; align-items: center; gap: 6px; background: rgba(255, 255, 255, 0.15); color: white; border: none; padding: 6px 12px; border-radius: 10px; font-size: 11.5px; font-weight: 600; cursor: pointer; transition: all 0.2s; backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.05); height: 32px; }
    .lc-end-btn:hover { background: #ef4444; border-color: #ef4444; transform: translateY(-1px); }
    .lc-end-btn svg { width: 14px; height: 14px; opacity: 0.9; }

    .lc-icon-btn { cursor: pointer; width: 32px; height: 32px; border-radius: 10px; background: rgba(255, 255, 255, 0.1); border: none; color: white; display: flex; align-items: center; justify-content: center; transition: all 0.2s; border: 1px solid rgba(255,255,255,0.05); }
    .lc-icon-btn svg { width: 20px; height: 20px; stroke: currentColor; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
    .lc-icon-btn:hover { background: rgba(255, 255, 255, 0.25); transform: translateY(-1px); }
    
    .lc-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #f8fafc; position: relative; }
    
    .lc-form-view { padding: 35px 25px 25px 25px; display: flex; flex-direction: column; gap: 12px; height: 100%; box-sizing: border-box; justify-content: flex-start; background: #fff; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; }
    .lc-form-view::-webkit-scrollbar { display: none; }
    .lc-form-title { font-size: 1.4rem; font-weight: 700; color: #0f172a; text-align: center; margin-bottom: 5px; letter-spacing: -0.3px; }
    .lc-field { display: flex; flex-direction: column; gap: 4px; }
    .lc-label { font-size: 0.75rem; color: #475569; font-weight: 600; margin-left: 2px; }
    .lc-input-field { padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; outline: none; font-family: inherit; font-size: 0.85rem; color: #0f172a; background: #f8fafc; transition: all 0.2s; }
    .lc-input-field::placeholder { color: #cbd5e1; }
    .lc-input-field:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
    textarea.lc-input-field { resize: vertical; min-height: 80px; max-height: 250px; }
    
    .lc-custom-select-wrapper { position: relative; }
    .lc-custom-select { padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-family: inherit; font-size: 0.85rem; background: #f8fafc; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; }
    .lc-custom-select:hover { border-color: #cbd5e1; }
    .lc-custom-select.active { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
    .lc-custom-select svg { width: 16px; height: 16px; stroke: #64748b; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transition: transform 0.2s; }
    .lc-custom-select.active svg { transform: rotate(180deg); }
    .lc-custom-options { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 20; display: none; flex-direction: column; max-height: 200px; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; }
    .lc-custom-options::-webkit-scrollbar { display: none; }
    .lc-custom-options.open { display: flex; }
    .lc-custom-search { padding: 8px; border-bottom: 1px solid #f1f5f9; position: sticky; top: 0; background: white; z-index: 21; }
    .lc-custom-search-input { width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.8rem; outline: none; font-family: inherit; }
    .lc-custom-search-input:focus { border-color: #3b82f6; }
    .lc-custom-option { padding: 10px 12px; font-size: 0.85rem; color: #0f172a; cursor: pointer; transition: background 0.1s; }
    .lc-custom-option:hover { background: #f1f5f9; }

    .lc-submit-btn { margin-top: 5px; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2); }
    .lc-submit-btn:hover { background: #2563eb; transform: translateY(-1px); box-shadow: 0 6px 15px rgba(59, 130, 246, 0.3); }

    .lc-waiting-view { display: none; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 30px; text-align: center; color: #64748b; }
    .lc-feedback-view { display: none; flex-direction: column; align-items: center; justify-content: flex-start; height: 100%; padding: 20px 30px; text-align: center; background: #fff; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; -ms-overflow-style: none; box-sizing: border-box; }
    .lc-feedback-view::-webkit-scrollbar { display: none; }
    .lc-spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top: 3px solid #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 20px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    .lc-chat-view { display: none; flex-direction: column; height: 100%; position: relative; }
    .lc-messages { flex: 1; padding: 20px 10px 20px 20px; overflow-y: auto; display: flex; flex-direction: column; scrollbar-width: none; -ms-overflow-style: none; }
    .lc-messages::-webkit-scrollbar { display: none; }
    
    .lc-drag-overlay { position: absolute; inset: 0; background: rgba(59, 130, 246, 0.08); border: 2px dashed #3b82f6; border-radius: 16px; display: none; align-items: center; justify-content: center; z-index: 1000; pointer-events: none; box-sizing: border-box; }
    .lc-drag-overlay.active { display: flex; animation: fadeIn 0.2s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
    .lc-drag-text { background: white; padding: 12px 24px; border-radius: 30px; box-shadow: 0 10px 25px rgba(59, 130, 246, 0.2); color: #3b82f6; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px; }
    .lc-scroll-down { position: absolute; bottom: 85px; right: 20px; width: 36px; height: 36px; background: white; border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.15); display: none; align-items: center; justify-content: center; cursor: pointer; color: #3b82f6; border: 1px solid #e2e8f0; z-index: 10; transition: all 0.2s; }
    .lc-scroll-down:hover { background: #f8fafc; transform: translateY(-2px); }
    .lc-scroll-down svg { width: 20px; height: 20px; fill: currentColor; }
    .lc-message { display: flex; flex-direction: column; width: 100%; margin-bottom: 16px; }
    .lc-message.group-first, .lc-message.group-middle { margin-bottom: 2px; }
    .lc-message.visitor { align-items: flex-end; }
    .lc-message.admin { align-items: flex-start; }
    .lc-msg-meta { font-size: 11px; color: #94a3b8; margin-bottom: 4px; }
    .lc-message.admin .lc-msg-meta { margin-left: 36px; }
    .lc-msg-row { display: flex; gap: 8px; align-items: flex-end; max-width: 100%; box-sizing: border-box; }
    .lc-message.visitor .lc-msg-row { flex-direction: row-reverse; }
    .lc-msg-bubble { padding: 8px 14px; font-size: 14px; line-height: 1.4; box-shadow: 0 1px 2px rgba(0,0,0,0.1); word-break: break-word; min-width: 0; }
    .lc-message.visitor .lc-msg-bubble { background: #3b82f6; color: white; }
    .lc-message.admin .lc-msg-bubble { background: white; color: #1e293b; }
    .lc-message.has-file .lc-msg-bubble { padding: 4px; width: 260px; max-width: 100%; box-sizing: border-box; flex-shrink: 0; }
    
    .lc-message.single .lc-msg-bubble { border-radius: 20px; }
    .lc-message.visitor.group-first .lc-msg-bubble { border-radius: 20px 20px 4px 20px; }
    .lc-message.visitor.group-middle .lc-msg-bubble { border-radius: 20px 4px 4px 20px; }
    .lc-message.visitor.group-last .lc-msg-bubble { border-radius: 20px 4px 20px 20px; }
    .lc-message.admin.group-first .lc-msg-bubble { border-radius: 20px 20px 20px 4px; }
    .lc-message.admin.group-middle .lc-msg-bubble { border-radius: 4px 20px 20px 4px; }
    .lc-message.admin.group-last .lc-msg-bubble { border-radius: 4px 20px 20px 20px; }

    .lc-message .lc-media-wrapper { border-radius: 8px; }
    .lc-message.single.only-file .lc-media-wrapper { border-radius: 16px; }
    .lc-message.visitor.group-first.only-file .lc-media-wrapper { border-radius: 16px 16px 2px 16px; }
    .lc-message.visitor.group-middle.only-file .lc-media-wrapper { border-radius: 16px 2px 2px 16px; }
    .lc-message.visitor.group-last.only-file .lc-media-wrapper { border-radius: 16px 2px 16px 16px; }
    .lc-message.admin.group-first.only-file .lc-media-wrapper { border-radius: 16px 16px 16px 2px; }
    .lc-message.admin.group-middle.only-file .lc-media-wrapper { border-radius: 2px 16px 16px 2px; }
    .lc-message.admin.group-last.only-file .lc-media-wrapper { border-radius: 2px 16px 16px 16px; }

    .lc-message.single.has-file:not(.only-file) .lc-media-wrapper { border-radius: 16px 16px 6px 6px; }
    .lc-message.visitor.group-first.has-file:not(.only-file) .lc-media-wrapper { border-radius: 16px 16px 6px 6px; }
    .lc-message.visitor.group-middle.has-file:not(.only-file) .lc-media-wrapper { border-radius: 16px 2px 6px 6px; }
    .lc-message.visitor.group-last.has-file:not(.only-file) .lc-media-wrapper { border-radius: 16px 2px 6px 6px; }
    .lc-message.admin.group-first.has-file:not(.only-file) .lc-media-wrapper { border-radius: 16px 16px 6px 6px; }
    .lc-message.admin.group-middle.has-file:not(.only-file) .lc-media-wrapper { border-radius: 2px 16px 6px 6px; }
    .lc-message.admin.group-last.has-file:not(.only-file) .lc-media-wrapper { border-radius: 2px 16px 6px 6px; }

    .lc-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; background-color: #f1f5f9; display: flex; align-items: center; justify-content: center; }
    .lc-message.admin.group-first .lc-avatar, .lc-message.admin.group-middle .lc-avatar { opacity: 0; pointer-events: none; }
    
    .lc-msg-time { font-size: 11px; color: #cbd5e1; white-space: nowrap; margin-bottom: 6px; font-weight: 500; }
    .lc-message.group-first .lc-msg-time, .lc-message.group-middle .lc-msg-time { opacity: 0; pointer-events: none; }
    
    .lc-input-area { padding: 15px; background: white; border-top: 1px solid #e2e8f0; display: flex; gap: 10px; align-items: flex-end; position: relative; }
    .lc-plus-btn { background: #f1f5f9; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; color: #64748b; transition: all 0.2s; flex-shrink: 0; margin-bottom: 3px; }
    .lc-plus-btn:hover { background: #e2e8f0; color: #3b82f6; transform: rotate(90deg); }
    .lc-plus-btn svg { width: 20px; height: 20px; stroke: currentColor; fill: none; stroke-width: 2.5; }
    
    .lc-plus-menu { position: absolute; bottom: 65px; left: 15px; background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 1px solid #e2e8f0; display: none; flex-direction: column; overflow: hidden; z-index: 100; min-width: 150px; }
    .lc-plus-menu.open { display: flex; animation: slideUp 0.2s ease-out; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .lc-menu-item { padding: 12px 16px; font-size: 13px; font-weight: 500; color: #475569; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: background 0.2s; }
    .lc-menu-item:hover { background: #f8fafc; color: #3b82f6; }
    .lc-menu-item svg { width: 18px; height: 18px; }

    .lc-recording-overlay { position: absolute; inset: 0; background: white; display: none; align-items: center; padding: 0 15px; z-index: 10; gap: 12px; }
    .lc-recording-overlay.active { display: flex; }
    .lc-rec-dot { width: 10px; height: 10px; background: #ef4444; border-radius: 50%; animation: pulse 1s infinite; }
    .lc-rec-dot.paused { animation: none; opacity: 0.5; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
    .lc-rec-time { font-family: monospace; font-size: 14px; font-weight: 600; color: #1e293b; }
    .lc-rec-visualizer { flex: 1; height: 24px; margin: 0 10px; display: block; min-width: 50px; }
    .lc-rec-pause { color: #3b82f6; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; }
    .lc-rec-pause svg { width: 18px; height: 18px; }
    .lc-rec-pause:hover { color: #2563eb; }
    .lc-rec-cancel { color: #ef4444; font-size: 13px; font-weight: 600; cursor: pointer; }
    .lc-rec-send { background: #3b82f6; color: white; border: none; width: 34px; height: 34px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }

    .lc-input { flex: 1; border: 1px solid #cbd5e1; border-radius: 20px; padding: 10px 15px; outline: none; font-size: 14px; background: white; resize: none; min-height: 40px; max-height: 120px; overflow-y: auto; box-sizing: border-box; font-family: inherit; line-height: 1.4; scrollbar-width: none; }
    .lc-input::-webkit-scrollbar { display: none; }
    .lc-send { background: #3b82f6; color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

    .lc-feedback-icon { width: 44px; height: 44px; border-radius: 50%; background: #eff6ff; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
    .lc-feedback-icon svg { width: 24px; height: 24px; fill: #3b82f6; }
    .lc-feedback-title { font-size: 1.15rem; font-weight: 700; color: #0f172a; margin: 0 0 4px 0; }
    .lc-feedback-subtitle { font-size: 0.85rem; color: #64748b; margin: 0 0 16px 0; line-height: 1.4; }
    
    .lc-stars { display: flex; gap: 8px; margin-bottom: 16px; }
    .lc-star { cursor: pointer; color: #e2e8f0; transition: transform 0.2s; display: flex; }
    .lc-star:hover { transform: scale(1.15); }
    .lc-star svg { width: 28px; height: 28px; fill: currentColor; }
    .lc-star.active { color: #f59e0b; }
    
    .lc-feedback-textarea { width: 100%; box-sizing: border-box; resize: vertical; min-height: 80px; margin-bottom: 15px; border-radius: 12px; padding: 12px 15px; scrollbar-width: none; -ms-overflow-style: none; }
    .lc-feedback-textarea::-webkit-scrollbar { display: none; }
    .lc-feedback-actions { display: flex; flex-direction: column; width: 100%; gap: 10px; }
    .lc-full-btn { width: 100%; margin: 0; }
    .lc-skip-btn { background: transparent; color: #64748b; border: none; font-weight: 600; font-size: 0.9rem; cursor: pointer; padding: 10px; transition: color 0.2s; }
    .lc-skip-btn:hover { color: #0f172a; text-decoration: underline; }
    .lc-toast-container {
        position: absolute; top: 0; left: 0; right: 0; bottom: 0;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        z-index: 10001; pointer-events: none; padding: 0 40px; box-sizing: border-box;
    }
    .lc-toast {
        background: rgba(15, 23, 42, 0.95); color: white; padding: 14px 24px;
        border-radius: 16px; font-size: 14px; font-weight: 600; text-align: center;
        box-shadow: 0 20px 40px rgba(0,0,0,0.2); backdrop-filter: blur(12px);
        animation: lc-toast-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        pointer-events: auto; max-width: 100%; border: 1px solid rgba(255,255,255,0.1);
        margin-bottom: 10px;
    }
    @keyframes lc-toast-in {
        from { opacity: 0; transform: translateY(20px) scale(0.9); }
        to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .lc-toast.error { background: rgba(239, 68, 68, 0.95); }
    .lc-toast.success { background: rgba(34, 197, 94, 0.95); }
    `;
    document.head.appendChild(style);

    // Initial HTML
    const root = document.createElement('div');
    root.id = 'lc-root';
    root.innerHTML = `
    <div class="lc-widget-bubble" id="lc-bubble">
        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"></path></svg>
        <div class="lc-badge" id="lc-unread-badge" style="display:none;">0</div>
    </div>
    <div class="lc-widget-window" id="lc-window">
        <div class="lc-drag-overlay" id="lc-drag-overlay">
            <div class="lc-drag-text">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                Drop to Upload Files
            </div>
        </div>
        <div class="lc-header">
            <div class="lc-header-info">
                <div class="lc-avatar-main">
                    <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </div>
                <div class="lc-header-text">
                    <span class="lc-header-title" id="lc-header-title">Live Support</span>
                    <span class="lc-header-subtitle">We're Online</span>
                </div>
            </div>
            <div class="lc-header-controls">
                <button type="button" class="lc-end-btn" id="lc-end-chat" style="display:none;" title="End Chat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                    <span>End Chat</span>
                </button>
                <button type="button" class="lc-icon-btn" id="lc-minimize" title="Minimize">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        </div>
        <div class="lc-content">
            <div class="lc-form-view" id="lc-view-form">
                <div class="lc-form-title">Contact Support</div>
                <div class="lc-field"><label class="lc-label">Name</label><input class="lc-input-field" id="lc-name" placeholder="John Doe"></div>
                <div class="lc-field"><label class="lc-label">Email</label><input class="lc-input-field" id="lc-email" placeholder="john@example.com"></div>
                <div class="lc-field">
                    <label class="lc-label">Department</label>
                    <div class="lc-custom-select-wrapper">
                        <input type="hidden" id="lc-dept" value="">
                        <div class="lc-custom-select" id="lc-custom-select-trigger">
                            <span id="lc-dept-text" style="color: #cbd5e1;">Select Department</span>
                            <svg viewBox='0 0 24 24'><polyline points='6 9 12 15 18 9'></polyline></svg>
                        </div>
                        <div class="lc-custom-options" id="lc-dept-options"></div>
                    </div>
                </div>
                <div class="lc-field"><label class="lc-label">How can we help?</label><textarea class="lc-input-field" id="lc-desc" rows="3" placeholder="Describe your question or issue..."></textarea></div>
                <button class="lc-submit-btn" id="lc-start-btn">
                    <span>Start Conversation</span>
                    <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
            </div>
            
            <div class="lc-waiting-view" id="lc-view-waiting">
                <div class="lc-spinner"></div>
                <p>Connecting to agent...</p>
            </div>

            <div class="lc-chat-view" id="lc-view-chat">
                <div class="lc-messages" id="lc-messages"></div>
                <div class="lc-scroll-down" id="lc-scroll-down" title="Scroll to bottom">
                    <svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                </div>
                <div id="lc-file-preview-area" style="display:none; padding: 10px 12px; border-top: 1px solid #e2e8f0; background: #f8fafc; position: relative; width: 100%; box-sizing: border-box;"></div>
                <div class="lc-input-area" id="lc-input-area">
                    <div class="lc-plus-menu" id="lc-plus-menu">
                        <div class="lc-menu-item" id="lc-menu-attach">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2.12 2.12 0 1 1-3-3l9.19-9.19"></path></svg>
                            Attach File
                        </div>
                        <div class="lc-menu-item" id="lc-menu-record">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                            Record Audio
                        </div>
                    </div>
                    <button class="lc-plus-btn" id="lc-plus-btn" title="Add">
                        <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                    <input type="file" id="lc-file-input" multiple style="display:none;">
                    <textarea class="lc-input" id="lc-input" placeholder="Type message..." rows="1"></textarea>
                    <button class="lc-send" id="lc-send-btn">➤</button>
                    
                    <div class="lc-recording-overlay" id="lc-recording-overlay">
                        <div class="lc-rec-dot" id="lc-rec-dot"></div>
                        <div class="lc-rec-time" id="lc-rec-time">00:00</div>
                        <canvas id="lc-rec-canvas" class="lc-rec-visualizer"></canvas>
                        <div class="lc-rec-pause" id="lc-rec-pause" title="Pause/Resume">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        </div>
                        <div class="lc-rec-cancel" id="lc-rec-cancel">Cancel</div>
                        <button class="lc-rec-send" id="lc-rec-stop-send">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
                        </button>
                    </div>
                </div>
                <div id="lc-closed-notice" style="display:none; padding: 18px; text-align: center; color: #64748b; font-size: 13.5px; font-weight: 500; background: #f8fafc; border-top: 1px solid #e2e8f0; line-height: 1.5;">
                    This chat was closed/converted to support ticket
                </div>
            </div>

            <div class="lc-feedback-view" id="lc-view-feedback">
                <div id="lc-feedback-notice" style="display:none; margin-bottom: 12px; padding: 10px; background: #f0f7ff; color: #2563eb; border-radius: 12px; font-size: 13.5px; font-weight: 500; line-height: 1.5; text-align: center; width: 100%; box-sizing: border-box; border: 1px solid #dbeafe;"></div>
                <div class="lc-feedback-icon">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.18 14.14L6.65 11.97l1.41-1.41 2.76 2.76 7.12-7.12 1.41 1.41-8.52 8.53z"/></svg>
                </div>
                <h3 class="lc-feedback-title">Chat Ended</h3>
                <p class="lc-feedback-subtitle">How would you rate your experience?</p>
                <div class="lc-stars">
                    <span class="lc-star" data-v="1"><svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></span>
                    <span class="lc-star" data-v="2"><svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></span>
                    <span class="lc-star" data-v="3"><svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></span>
                    <span class="lc-star" data-v="4"><svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></span>
                    <span class="lc-star" data-v="5"><svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></span>
                </div>
                <textarea class="lc-input-field lc-feedback-textarea" id="lc-feedback-comment" placeholder="Tell us more about your experience..."></textarea>
                <div style="display:flex; align-items:center; gap:10px; width:100%; margin: -8px 0 12px 0; padding: 0 4px; cursor:pointer;" onclick="var c=this.querySelector('input'); c.checked = !c.checked; event.stopPropagation();">
                    <input type="checkbox" id="lc-send-transcript" style="cursor:pointer; width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid #cbd5e1; accent-color: #3b82f6;" onclick="event.stopPropagation();">
                    <label style="font-size: 13px; color: #64748b; cursor:pointer; font-weight: 500; user-select: none;">Email me a transcript of this conversation</label>
                </div>
                <div class="lc-feedback-actions">
                    <button type="button" class="lc-submit-btn lc-full-btn" id="lc-submit-feedback">Submit Feedback</button>
                    <button type="button" class="lc-skip-btn" id="lc-skip-feedback">Skip & Start New Chat</button>
                    <button class="lc-skip-btn" id="lc-email-transcript" style="display:none;">Email Transcript</button>
                </div>
            </div>
        </div>
    </div>`
        ;
    document.body.appendChild(root);

    // State
    let ws;
    let chatId = localStorage.getItem('lc_chat_id');
    let sessionData = JSON.parse(localStorage.getItem('lc_data') || '{}');
    let unreadCount = 0;

    // Pagination State
    let chatPage = 1;
    let chatLimit = 20;
    let hasMoreChats = true;
    let isLoadingChats = false;

    function showToast(msg, type = 'info', onConfirm = null, onCancel = null) {
        let overlay = document.getElementById('lc-dialog-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'lc-dialog-overlay';
            overlay.style.cssText = 'position: absolute; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(2px); z-index: 10002; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s;';
            document.getElementById('lc-window').appendChild(overlay);
        }

        const dialog = document.createElement('div');
        dialog.style.cssText = 'background: white; border-radius: 16px; padding: 24px; width: 85%; max-width: 300px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); transform: scale(0.95); transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; gap: 16px; text-align: center; box-sizing: border-box;';

        let iconSvg = '';
        if (type === 'error') {
            iconSvg = '<div style="width: 48px; height: 48px; border-radius: 50%; background: #fee2e2; display: flex; align-items: center; justify-content: center; margin: 0 auto; flex-shrink:0;"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ef4444" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></div>';
        } else if (type === 'success') {
            iconSvg = '<div style="width: 48px; height: 48px; border-radius: 50%; background: #dcfce7; display: flex; align-items: center; justify-content: center; margin: 0 auto; flex-shrink:0;"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#22c55e" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></div>';
        } else if (type === 'confirm') {
            iconSvg = '<div style="width: 48px; height: 48px; border-radius: 50%; background: #fef3c7; display: flex; align-items: center; justify-content: center; margin: 0 auto; flex-shrink:0;"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#f59e0b" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>';
        } else {
            iconSvg = '<div style="width: 48px; height: 48px; border-radius: 50%; background: #eff6ff; display: flex; align-items: center; justify-content: center; margin: 0 auto; flex-shrink:0;"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#3b82f6" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>';
        }

        const isConfirm = (type === 'confirm');

        dialog.innerHTML = `
            ${iconSvg}
            <div style="font-size: 15px; font-weight: 600; color: #0f172a; line-height: 1.4;">${msg}</div>
            <div style="display: flex; gap: 10px; margin-top: 8px; justify-content: center; width: 100%;">
                ${isConfirm ? `<button id="lc-dialog-cancel" style="flex: 1; padding: 10px 0; border: 1px solid #e2e8f0; border-radius: 8px; background: white; color: #64748b; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s;">Cancel</button>` : ''}
                <button id="lc-dialog-ok" style="flex: 1; padding: 10px 0; border: none; border-radius: 8px; background: #3b82f6; color: white; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.2);">OK</button>
            </div>
        `;

        overlay.innerHTML = '';
        overlay.appendChild(dialog);
        overlay.style.display = 'flex';
        void overlay.offsetWidth;
        overlay.style.opacity = '1';
        dialog.style.transform = 'scale(1)';

        const closeDialog = () => {
            overlay.style.opacity = '0';
            dialog.style.transform = 'scale(0.95)';
            setTimeout(() => { if (overlay) overlay.style.display = 'none'; }, 200);
        };

        const btnOk = document.getElementById('lc-dialog-ok');
        const btnCancel = document.getElementById('lc-dialog-cancel');

        if (btnOk) {
            btnOk.onmouseover = () => btnOk.style.background = '#2563eb';
            btnOk.onmouseout = () => btnOk.style.background = '#3b82f6';
            btnOk.onclick = () => {
                closeDialog();
                if (typeof onConfirm === 'function') onConfirm();
            };
        }
        if (btnCancel) {
            btnCancel.onmouseover = () => { btnCancel.style.background = '#f8fafc'; btnCancel.style.color = '#0f172a'; };
            btnCancel.onmouseout = () => { btnCancel.style.background = 'white'; btnCancel.style.color = '#64748b'; };
            btnCancel.onclick = () => {
                closeDialog();
                if (typeof onCancel === 'function') onCancel();
            };
        }
    }

    function updateBadge() {
        const badge = document.getElementById('lc-unread-badge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    let visitorInfo = {
        ip_address: "",
        country: "",
        browser: "",
        device: "",
        current_page: window.location.href
    };

    function init() {
        logVisitorInfo();
        loadDepts();
        if (sessionData.active && chatId) {
            chatPage = 1;
            hasMoreChats = true;
            isLoadingChats = false;
            connectWebSocket(chatId);
            loadPreviousChats(chatId, chatPage);
            setView('chat');
        } else {
            setView('form');
        }
    }

    function loadDepts() {
        const selValue = document.getElementById('lc-dept');
        const selText = document.getElementById('lc-dept-text');
        const optionsContainer = document.getElementById('lc-dept-options');
        const trigger = document.getElementById('lc-custom-select-trigger');

        let listContainer = document.createElement('div');

        trigger.addEventListener('click', (e) => {
            optionsContainer.classList.toggle('open');
            trigger.classList.toggle('active');
            e.stopPropagation();
        });

        document.addEventListener('click', (e) => {
            if (!optionsContainer.contains(e.target) && !trigger.contains(e.target)) {
                optionsContainer.classList.remove('open');
                trigger.classList.remove('active');
            }
        });

        optionsContainer.innerHTML = '';
        optionsContainer.appendChild(listContainer);

        const hardcodedDepts = ["UI", "General", "Server related", "Other"];

        function renderDeptsList() {
            listContainer.innerHTML = '';
            hardcodedDepts.forEach(deptName => {
                const o = document.createElement('div');
                o.className = 'lc-custom-option';
                o.textContent = deptName;
                o.addEventListener('click', () => {
                    selValue.value = deptName;
                    selText.textContent = deptName;
                    selText.style.color = '#0f172a';
                    optionsContainer.classList.remove('open');
                    trigger.classList.remove('active');
                });
                listContainer.appendChild(o);
            });
        }

        renderDeptsList();
    }

    function setView(v) {
        ['form', 'waiting', 'chat', 'feedback'].forEach(id => document.getElementById(`lc-view-${id}`).style.display = 'none');
        document.getElementById(`lc-view-${v}`).style.display = 'flex';
        document.getElementById('lc-end-chat').style.display = (v === 'chat' || v === 'waiting') ? 'block' : 'none';
    }

    let reconnectTimeout = null;

    function connectWebSocket(id) {
        if (ws) {
            ws.onclose = null; // Prevent old reconnect triggers
            ws.onerror = null;
            ws.close();
        }

        ws = new WebSocket(`${wsUrl}/api/v1/client/ws/chat/${id}?type=client`);

        ws.onopen = () => {
            console.log("WebSocket connected");
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'notification') {
                    const win = document.getElementById('lc-window');
                    // Only show formal dialog for non-routine notifications when widget is closed
                    if ((!win || !win.classList.contains('open')) && data.title !== "New reply from support") {
                        showToast(data.title || "Notification", 'info');
                    }
                    if (data.title === "New reply from support") {
                        handleChatStatus('open');
                    }
                    console.log("Notification:", data.title);
                } else if (data.type === 'message' || data.type === 'response') {
                    const msg = data.data;
                        if (msg) {
                            const currentStatus = data.status || msg.status;
                            if (currentStatus) {
                                handleChatStatus(currentStatus, msg.message_type === 'public log' ? msg.message : null);
                            }
                            const isVisitor = msg.messager === 'client';
                            const existingMsg = document.getElementById(`msg-${msg.id}`);
                            if (!existingMsg) {
                                if (msg.message_type === 'public log') {
                                    addSysMsg(msg.message);
                                    if (!currentStatus) handleChatStatus('open');
                                    return;
                                }
                            const profilePic = (msg.messaged_as_staff && msg.messaged_as_staff.profile_pic) || '';
                            addMsg({
                                id: msg.id,
                                sender: isVisitor ? 'visitor' : 'admin',
                                senderName: isVisitor ? 'You' : (msg.messaged_as_staff && msg.messaged_as_staff.full_name) || (msg.message_by || '').split('(')[0].trim() || 'Agent',
                                text: msg.message,
                                profilePic: profilePic,
                                filePath: msg.file_path,
                                createdAt: msg.created_at || msg.CreatedAt || msg.timestamp || new Date().toISOString()
                            });
                            if (!isVisitor) {
                                audio.play().catch(e => { });
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("WebSocket message parsing error", err);
            }
        };

        ws.onerror = (err) => {
            console.error("WebSocket error:", err);
            // ws.close() gets called automatically or we can force it
            if (ws.readyState === WebSocket.OPEN) ws.close();
        };

        ws.onclose = () => {
            console.log("WebSocket closed");
            ws = null;
            if (sessionData.active && chatId) {
                if (!reconnectTimeout) {
                    reconnectTimeout = setTimeout(() => {
                        console.log("Attempting to reconnect WebSocket...");
                        reconnectTimeout = null;
                        connectWebSocket(chatId);
                        loadPreviousChats(chatId);
                    }, 3000);
                }
            }
        };
    }

    function loadPreviousChats(id, page = 1) {
        if (page > 1 && (isLoadingChats || !hasMoreChats)) return;
        isLoadingChats = true;

        const msgsContainer = document.getElementById('lc-messages');
        let loader = document.getElementById('lc-chat-loader');

        if (msgsContainer && page > 1) {
            if (!loader) {
                loader = document.createElement('div');
                loader.id = 'lc-chat-loader';
                loader.style.cssText = 'text-align:center; padding: 15px 10px; color: #94a3b8; font-size: 11px; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; flex-shrink: 0; box-sizing: border-box; height: 60px;';
                loader.innerHTML = '<div class="lc-loader" style="width:18px;height:18px;border:2px solid #e2e8f0;border-top:2px solid #3b82f6;border-radius:50%;animation:spin 0.8s linear infinite;"></div><span style="font-weight:500; letter-spacing: 0.3px;">Loading older messages...</span>';

                // Keep the loader at the absolute top
                msgsContainer.insertBefore(loader, msgsContainer.firstChild);
            } else {
                loader.style.display = 'flex';
                if (msgsContainer.firstChild !== loader) {
                    msgsContainer.insertBefore(loader, msgsContainer.firstChild);
                }
            }
        }

        const fetchStartTime = Date.now();

        fetch(`${baseUrl}/api/v1/client/chatbot/chat/${id}?page=${page}&limit=${chatLimit}`)
            .then(res => res.json())
            .then(data => {
                const processResponse = () => {
                    let chatsArray = [];
                    let status = null;

                    if (data) {
                        status = data.status || (data.data && data.data.status);
                    }

                    if (Array.isArray(data)) {
                        chatsArray = data;
                    } else if (data && Array.isArray(data.data)) {
                        chatsArray = data.data;
                    } else if (data && data.data && Array.isArray(data.data.chats)) {
                        chatsArray = data.data.chats;
                    } else if (data && Array.isArray(data.chats)) {
                        chatsArray = data.chats;
                    } else if (data && data.data && Array.isArray(data.data.messages)) {
                        chatsArray = data.data.messages;
                    } else if (data && data.data && Array.isArray(data.data.Messages)) {
                        chatsArray = data.data.Messages;
                    }

                    if (chatsArray.length < chatLimit) {
                        hasMoreChats = false;
                    }

                    if (chatsArray.length > 0) {
                        const tempContainer = document.createElement('div');
                        chatsArray.reverse().forEach(msg => {
                            if (msg.message_type === 'public log') {
                                addSysMsg(msg.message);
                                return;
                            }
                            const isVisitor = msg.messager === 'client';
                            const profilePic = (msg.messaged_as_staff && msg.messaged_as_staff.profile_pic) || '';

                            addMsg({
                                id: msg.id,
                                sender: isVisitor ? 'visitor' : 'admin',
                                senderName: isVisitor ? 'You' : (msg.messaged_as_staff && msg.messaged_as_staff.full_name) || (msg.message_by || '').split('(')[0].trim() || 'Agent',
                                text: msg.message,
                                profilePic: profilePic,
                                filePath: msg.file_path,
                                createdAt: msg.created_at || msg.CreatedAt || msg.timestamp || null
                            }, true, page > 1 ? tempContainer : msgsContainer);
                        });

                        if (page > 1 && msgsContainer) {
                            const previousScrollHeight = msgsContainer.scrollHeight;
                            const previousScrollTop = msgsContainer.scrollTop;

                            if (loader) loader.style.display = 'none';

                            let referenceNode = msgsContainer.firstChild;
                            if (referenceNode === loader) {
                                referenceNode = loader.nextSibling;
                            }

                            while (tempContainer.firstChild) {
                                msgsContainer.insertBefore(tempContainer.firstChild, referenceNode);
                            }

                            const newScrollHeight = msgsContainer.scrollHeight;
                            msgsContainer.scrollTop = previousScrollTop + (newScrollHeight - previousScrollHeight);
                        }
                    } else {
                        if (page === 1) {
                            console.log("No previous chats or unrecognized JSON structure:", data);
                        }
                        hasMoreChats = false;
                        if (loader) loader.style.display = 'none';
                    }

                    if (page === 1) {
                        const lastLog = chatsArray.filter(m => m.message_type === 'public log').pop();
                        handleChatStatus(status, lastLog ? lastLog.message : null);
                    }
                    isLoadingChats = false;
                };

                if (page > 1) {
                    const elapsed = Date.now() - fetchStartTime;
                    const delay = Math.max(0, 500 - elapsed);
                    setTimeout(processResponse, delay);
                } else {
                    processResponse();
                }
            }).catch(err => {
                console.error("Error loading chats:", err);
                if (loader) loader.style.display = 'none';
                isLoadingChats = false;
            });
    }

    // Actions
    document.getElementById('lc-start-btn').addEventListener('click', (e) => {
        e.preventDefault();
        const name = document.getElementById('lc-name').value;
        const email = document.getElementById('lc-email').value;
        const dept = document.getElementById('lc-dept').value;
        const desc = document.getElementById('lc-desc').value;

        if (!name || !email) return showToast('Name and Email required', 'error');

        const websiteId = localStorage.getItem('website_id') || WEBSITE_ID || "d894d558-a671-473a-a1b6-a5b11176b8e5";

        const payload = {
            name: name,
            email: email,
            department: dept || "General",
            website_id: websiteId,
            description: desc,
            ip_address: visitorInfo.ip_address || "127.0.0.1",
            country: visitorInfo.country || "Unknown",
            browser: visitorInfo.browser || "Unknown",
            device: visitorInfo.device || "Unknown",
            current_page: visitorInfo.current_page || window.location.href
        };

        const msgsContainer = document.getElementById('lc-messages');
        if (msgsContainer) msgsContainer.innerHTML = '';
        setView('waiting');

        fetch(`${baseUrl}/api/v1/client/chatbot/new_chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(async res => {
                if (!res.ok) {
                    const errorText = await res.text();
                    console.error("400 Bad Request details:", errorText);
                    throw new Error(`Server returned ${res.status}: ${errorText}`);
                }
                return res.json();
            })
            .then(data => {
                let id = null;
                let status = null;

                if (data && data.data && data.data.chats && data.data.chats.length > 0) {
                    id = data.data.chats[0].id;
                    status = data.data.chats[0].status;
                } else if (data && data.chats) {
                    id = data.chats.id;
                    status = data.chats.status;
                }

                if (id) {
                    chatId = id;
                    localStorage.setItem('lc_chat_id', chatId);
                    sessionData = { active: true, name: name, email: email, department: dept || "General" };
                    localStorage.setItem('lc_data', JSON.stringify(sessionData));

                    chatPage = 1;
                    hasMoreChats = true;
                    isLoadingChats = false;

                    connectWebSocket(chatId);
                    loadPreviousChats(chatId, chatPage);
                    setView('chat');
                    handleChatStatus(status);
                } else {
                    showToast("Failed to start chat.", 'error');
                    setView('form');
                }
            }).catch(err => {
                console.error("Start chat error:", err);
                showToast("Error starting chat.", 'error');
                setView('form');
            });
    });

    document.getElementById('lc-send-btn').addEventListener('click', sendMsg);

    const inputEl = document.getElementById('lc-input');
    inputEl.addEventListener('keypress', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMsg();
        }
    });
    inputEl.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        if (this.value === '') this.style.height = '40px';
    });

    const plusBtn = document.getElementById('lc-plus-btn');
    const plusMenu = document.getElementById('lc-plus-menu');

    plusBtn.addEventListener('click', (e) => {
        plusMenu.classList.toggle('open');
        e.stopPropagation();
    });

    document.addEventListener('click', () => {
        plusMenu.classList.remove('open');
    });

    document.getElementById('lc-menu-attach').addEventListener('click', () => {
        document.getElementById('lc-file-input').click();
        plusMenu.classList.remove('open');
    });

    // Recording Logic
    let mediaRecorder;
    let audioChunks = [];
    let recordInterval;
    let recStartTime;
    let recPausedTime = 0;
    let lastPauseStart = 0;

    let audioContext;
    let analyser;
    let dataArray;
    let animationId;

    document.getElementById('lc-menu-record').addEventListener('click', startRecording);
    document.getElementById('lc-rec-cancel').addEventListener('click', cancelRecording);
    document.getElementById('lc-rec-stop-send').addEventListener('click', stopAndSendRecording);
    document.getElementById('lc-rec-pause').addEventListener('click', togglePauseRecording);

    async function startRecording() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast("Microphone access is not supported.", 'error');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 128;
            source.connect(analyser);
            dataArray = new Uint8Array(analyser.frequencyBinCount);

            // Try supported types
            const mimeType = MediaRecorder.isTypeSupported('audio/mpeg') ? 'audio/mpeg' :
                MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
                    MediaRecorder.isTypeSupported('audio/ogg') ? 'audio/ogg' : '';

            mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                if (audioChunks.length > 0 && !isRecordingCanceled) {
                    const finalMime = mediaRecorder.mimeType || 'audio/mpeg';
                    const extension = 'mp3';
                    const audioBlob = new Blob(audioChunks, { type: finalMime });

                    const file = new File([audioBlob], `voice_record_${Date.now()}.${extension}`, { type: finalMime });
                    // Directly send as a file
                    selectedFilesInfo = [{
                        id: Math.random().toString(36).substr(2, 9),
                        file: file,
                        status: 'pending',
                        msg: ''
                    }];
                    sendMsg();
                }
                stream.getTracks().forEach(track => track.stop());
            };

            let isRecordingCanceled = false;
            window.cancelRecTask = () => { isRecordingCanceled = true; };

            mediaRecorder.start();
            plusMenu.classList.remove('open');
            document.getElementById('lc-recording-overlay').classList.add('active');

            recStartTime = Date.now();
            recPausedTime = 0;
            document.getElementById('lc-rec-pause').innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
            document.getElementById('lc-rec-dot').classList.remove('paused');
            updateRecTime();
            recordInterval = setInterval(updateRecTime, 1000);

            drawVisualizer();

        } catch (err) {
            console.error("Recording error details:", err);
            let userMsg = "Could not access microphone.";
            if (err.name === 'NotAllowedError') userMsg = "Microphone permission was denied.";
            else if (err.name === 'NotFoundError') userMsg = "No microphone found on this device.";
            else if (err.name === 'SecurityError') userMsg = "Microphone access is blocked (Secure Context required).";

            showToast(userMsg, 'error');
            finishRecordingUI();
        }
    }

    function updateRecTime() {
        let currentElapsed = 0;
        if (mediaRecorder && mediaRecorder.state === 'paused') {
            currentElapsed = Math.floor((lastPauseStart - recStartTime - recPausedTime) / 1000);
        } else {
            currentElapsed = Math.floor((Date.now() - recStartTime - recPausedTime) / 1000);
        }
        const elapsed = Math.max(0, currentElapsed);
        const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const secs = (elapsed % 60).toString().padStart(2, '0');
        document.getElementById('lc-rec-time').textContent = `${mins}:${secs}`;
    }

    function togglePauseRecording() {
        if (!mediaRecorder) return;

        const pauseBtn = document.getElementById('lc-rec-pause');
        const recDot = document.getElementById('lc-rec-dot');

        if (mediaRecorder.state === 'recording') {
            mediaRecorder.pause();
            lastPauseStart = Date.now();
            pauseBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
            recDot.classList.add('paused');
            updateRecTime();
        } else if (mediaRecorder.state === 'paused') {
            mediaRecorder.resume();
            recPausedTime += (Date.now() - lastPauseStart);
            pauseBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
            recDot.classList.remove('paused');
            updateRecTime();
        }
    }

    function cancelRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            if (window.cancelRecTask) window.cancelRecTask();
            mediaRecorder.stop();
        }
        finishRecordingUI();
    }

    function stopAndSendRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        finishRecordingUI();
    }

    function finishRecordingUI() {
        document.getElementById('lc-recording-overlay').classList.remove('active');
        clearInterval(recordInterval);
        if (animationId) cancelAnimationFrame(animationId);
        if (audioContext && audioContext.state !== 'closed') audioContext.close();
    }

    function drawVisualizer() {
        const canvas = document.getElementById('lc-rec-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth || 100;
        const height = canvas.height = canvas.offsetHeight || 24;

        function draw() {
            if (!mediaRecorder || mediaRecorder.state === 'inactive') {
                ctx.clearRect(0, 0, width, height);
                return;
            }
            animationId = requestAnimationFrame(draw);

            if (mediaRecorder.state === 'paused') {
                return;
            }

            if (analyser) analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, width, height);

            const totalBars = Math.min(dataArray.length, 50); // limit number of bars
            const barWidth = width / totalBars;
            let barHeight;
            let x = 0;

            for (let i = 0; i < totalBars; i++) {
                // smooth out the curve a bit by pushing the lower frequencies
                barHeight = (dataArray[i] / 255) * height;
                if (barHeight < 2) barHeight = 2;

                ctx.fillStyle = '#64748b'; // match the dark grey lines
                ctx.beginPath();
                const actualWidth = Math.max(2, barWidth - 2); // add gaps between lines
                if (ctx.roundRect) {
                    ctx.roundRect(x + (barWidth - actualWidth) / 2, height / 2 - barHeight / 2, actualWidth, barHeight, 2);
                } else {
                    ctx.rect(x + (barWidth - actualWidth) / 2, height / 2 - barHeight / 2, actualWidth, barHeight);
                }
                ctx.fill();

                x += barWidth;
            }
        }
        draw();
    }

    let selectedFilesInfo = []; // array of { id, file, status, msg }

    function renderFilePreview() {
        const pArea = document.getElementById('lc-file-preview-area');
        if (!pArea) return;
        if (selectedFilesInfo.length === 0) {
            pArea.style.display = 'none';
            document.getElementById('lc-input').placeholder = 'Type message...';
            return;
        }
        pArea.style.display = 'flex';
        pArea.innerHTML = '';
        const pendingCount = selectedFilesInfo.filter(f => f.status === 'pending' || f.status === 'failed').length;
        if (pendingCount > 0) {
            document.getElementById('lc-input').placeholder = `${pendingCount} file(s) attached...`;
        } else {
            document.getElementById('lc-input').placeholder = 'Type message...';
        }

        const track = document.createElement('div');
        track.id = 'lc-file-track';
        track.style.cssText = 'display:flex; gap:8px; flex-wrap:nowrap; width:max-content; padding: 0 4px;';

        selectedFilesInfo.forEach((fObj) => {
            const chip = document.createElement('div');
            // Modern styling
            chip.style.cssText = 'position:relative; display:flex; align-items:center; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:18px; padding:6px 10px; font-size:12.5px; max-width:115px; flex-shrink:0; box-shadow:0 1px 2px rgba(0,0,0,0.02); transition:all 0.2s;';

            const isAud = fObj.file && fObj.file.type && fObj.file.type.startsWith('audio/');

            const docIcon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="#64748b" style="margin-right:6px; flex-shrink:0;"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>';
            const audIcon = '<div style="display:flex; align-items:center; gap:2px; margin-right:6px; height:12px;"><div style="width:2px;height:40%;background:#64748b;border-radius:1px;"></div><div style="width:2px;height:80%;background:#64748b;border-radius:1px;"></div><div style="width:2px;height:100%;background:#64748b;border-radius:1px;"></div><div style="width:2px;height:60%;background:#64748b;border-radius:1px;"></div></div>';

            const iconSvg = isAud ? audIcon : docIcon;
            const icon = fObj.status === 'failed' ? '<span style="margin-right:6px;font-size:14px;">⚠️</span>' : (fObj.status === 'uploading' ? '<div class="lc-loader" style="width:14px;height:14px;border:2px solid #3b82f6;border-top:2px solid transparent;border-radius:50%;animation:spin 1s linear infinite;margin-right:6px;flex-shrink:0;"></div>' : iconSvg);

            let nameCss = 'white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:500; color:#334155; font-family:sans-serif; width:100%; display:block;';
            if (fObj.status === 'failed') nameCss += ' color:#ef4444;';
            if (fObj.status === 'uploading') nameCss += ' opacity:0.6;';

            let actionBtn = '';
            if (fObj.status === 'failed') {
                actionBtn = `<span title="Retry" style="cursor:pointer; color:#ef4444; margin-left:4px; font-weight:bold; font-size:14px; padding:0 4px;">↻</span>`;
            }

            let crossBtn = '';
            if (fObj.status !== 'uploading') {
                crossBtn = `<span class="lc-chip-cross" style="cursor:pointer; font-weight:bold; margin-left:6px; color:#94a3b8; padding:0 2px; font-size:16px; line-height:1; transition:color 0.2s;" title="Remove">×</span>`;
            }

            let nameEl = `
                <div style="flex:1; min-width:0; position:relative; display:flex; align-items:center;" onmouseenter="this.querySelector('.lc-file-tooltip').style.opacity=1;this.querySelector('.lc-file-tooltip').style.visibility='visible';this.querySelector('.lc-file-tooltip').style.transform='translateX(-50%) translateY(0)';" onmouseleave="this.querySelector('.lc-file-tooltip').style.opacity=0;this.querySelector('.lc-file-tooltip').style.visibility='hidden';this.querySelector('.lc-file-tooltip').style.transform='translateX(-50%) translateY(8px)';">
                    <span style="${nameCss}">${fObj.file.name}</span>
                    <div class="lc-file-tooltip" style="position: absolute; bottom: 100%; left: 50%; background: #1e293b; color: white; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 500; word-break: break-all; max-width: 200px; width: max-content; opacity: 0; visibility: hidden; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); transform: translateX(-50%) translateY(8px); z-index: 50; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.05); pointer-events: none; margin-bottom: 8px; text-align: center; line-height: 1.3;">${fObj.file.name}</div>
                </div>
            `;

            chip.innerHTML = `<span style="display:flex;align-items:center;flex-shrink:0;">${icon}</span>${nameEl}${actionBtn}${crossBtn}`;

            if (fObj.status === 'failed') {
                chip.querySelector('span[title="Retry"]').onclick = () => doUpload(fObj.id);
            }
            if (fObj.status !== 'uploading') {
                const crossEl = chip.querySelector('.lc-chip-cross');
                crossEl.onclick = () => {
                    selectedFilesInfo = selectedFilesInfo.filter(x => x.id !== fObj.id);
                    renderFilePreview();
                };
                crossEl.onmouseover = () => crossEl.style.color = '#ef4444';
                crossEl.onmouseout = () => crossEl.style.color = '#94a3b8';
            }
            track.appendChild(chip);
        });

        const scrollContainer = document.createElement('div');
        scrollContainer.style.cssText = 'overflow-x:auto; overflow-y:hidden; scroll-behavior:smooth; scrollbar-width:none; width:100%; padding-top: 40px; margin-top: -40px;';
        scrollContainer.appendChild(track);
        pArea.appendChild(scrollContainer);

        scrollContainer.addEventListener("wheel", function (e) {
            if (e.deltaY !== 0) {
                e.preventDefault();
                scrollContainer.scrollLeft += e.deltaY;
            }
        });

        const leftZone = document.createElement('div');
        leftZone.style.cssText = 'position:absolute; left:0; top:0; bottom:0; width:45px; display:flex; align-items:center; justify-content:flex-start; padding-left:6px; z-index:5; background:linear-gradient(to right, #f8fafc 40%, transparent); opacity:0; transition:opacity 0.2s; pointer-events:none;';

        const leftBtn = document.createElement('div');
        leftBtn.style.cssText = 'width:24px; height:24px; background:white; border:1px solid #e2e8f0; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.1); pointer-events:auto;';
        leftBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="#334155"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>';
        leftZone.appendChild(leftBtn);

        const rightZone = document.createElement('div');
        rightZone.style.cssText = 'position:absolute; right:0; top:0; bottom:0; width:45px; display:flex; align-items:center; justify-content:flex-end; padding-right:6px; z-index:5; background:linear-gradient(to left, #f8fafc 40%, transparent); opacity:0; transition:opacity 0.2s; pointer-events:none;';

        const rightBtn = document.createElement('div');
        rightBtn.style.cssText = 'width:24px; height:24px; background:white; border:1px solid #e2e8f0; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.1); pointer-events:auto;';
        rightBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="#334155"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>';
        rightZone.appendChild(rightBtn);

        pArea.appendChild(leftZone);
        pArea.appendChild(rightZone);

        let canScrollLeft = false;
        let canScrollRight = false;

        const checkScroll = () => {
            if (!scrollContainer.clientWidth) return;
            const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
            canScrollLeft = scrollContainer.scrollLeft > 0;
            canScrollRight = scrollContainer.scrollLeft < maxScroll - 1; // 1px threshold for rounding errors
        };

        scrollContainer.addEventListener('scroll', checkScroll);

        leftBtn.onclick = () => scrollContainer.scrollBy({ left: -140, behavior: 'smooth' });
        rightBtn.onclick = () => scrollContainer.scrollBy({ left: 140, behavior: 'smooth' });

        pArea.addEventListener('mousemove', (e) => {
            checkScroll();
            const rect = pArea.getBoundingClientRect();
            const x = e.clientX - rect.left;

            if (x < 60 && canScrollLeft) {
                leftZone.style.opacity = '1';
                rightZone.style.opacity = '0';
            } else if (x > rect.width - 60 && canScrollRight) {
                rightZone.style.opacity = '1';
                leftZone.style.opacity = '0';
            } else {
                leftZone.style.opacity = '0';
                rightZone.style.opacity = '0';
            }
        });

        pArea.addEventListener('mouseleave', () => {
            leftZone.style.opacity = '0';
            rightZone.style.opacity = '0';
        });

        // Initialize tracking
        setTimeout(checkScroll, 50);

        if (!document.getElementById('lc-spin-style')) {
            const style = document.createElement('style');
            style.id = 'lc-spin-style';
            style.innerHTML = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }
    }

    function handleFiles(files) {
        const fileList = Array.from(files);
        if (fileList.length === 0) return;

        if (selectedFilesInfo.length + fileList.length > 5) {
            showToast("Maximum 5 files allowed.", 'error');
        }

        const allowed = fileList.slice(0, 5 - selectedFilesInfo.length);
        allowed.forEach(f => {
            selectedFilesInfo.push({
                id: Math.random().toString(36).substr(2, 9),
                file: f,
                status: 'pending',
                msg: ''
            });
        });

        renderFilePreview();
    }

    document.getElementById('lc-file-input').addEventListener('change', (e) => {
        handleFiles(e.target.files);
        e.target.value = ''; // Reset input to allow adding the same file again
    });

    const winEl = document.getElementById('lc-window');
    const dragOverlay = document.getElementById('lc-drag-overlay');
    let dragCounter = 0;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        winEl.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    winEl.addEventListener('dragenter', (e) => {
        dragCounter++;
        if (dragCounter === 1) {
            dragOverlay.classList.add('active');
        }
    });

    winEl.addEventListener('dragleave', (e) => {
        dragCounter--;
        if (dragCounter === 0) {
            dragOverlay.classList.remove('active');
        }
    });

    winEl.addEventListener('drop', (e) => {
        dragCounter = 0;
        dragOverlay.classList.remove('active');
        if (e.dataTransfer && e.dataTransfer.files) {
            handleFiles(e.dataTransfer.files);
        }
    }, false);

    inputEl.addEventListener('paste', (e) => {
        if (e.clipboardData && e.clipboardData.files.length > 0) {
            e.preventDefault();
            handleFiles(e.clipboardData.files);
        }
    });

    async function doUploadFile(fObj, tempId, fileUrl) {
        if (!chatId) return;

        const formData = new FormData();
        const visitorData = {
            message: fObj.msg || '',
            name: sessionData.name || "",
            email: sessionData.email || "",
            current_page: window.location.href,
            ip_address: visitorInfo.ip_address || "127.0.0.1",
            country: visitorInfo.country || "Unknown",
            browser: visitorInfo.browser || "Unknown",
            device: visitorInfo.device || "Unknown",
            website_id: WEBSITE_ID,
            department: sessionData.department || ""
        };
        formData.append('data', JSON.stringify(visitorData));
        if (fObj.file) {
            formData.append('file', fObj.file);
        }

        try {
            const res = await fetch(`${baseUrl}/api/v1/client/chatbot/chat/${chatId}/file`, {
                method: 'POST',
                body: formData
            });
            if (!res.ok) throw new Error("Upload failed");

            const tempEl = document.getElementById('msg-' + tempId);
            if (tempEl) tempEl.remove();

            setTimeout(() => URL.revokeObjectURL(fileUrl), 100);
        } catch (err) {
            console.error("File upload error:", err);
            const tempEl = document.getElementById('msg-' + tempId);
            if (tempEl) {
                const timeEl = tempEl.querySelector('.lc-msg-time');
                if (timeEl) {
                    timeEl.innerHTML = '<span style="color:#ef4444;font-weight:bold;cursor:pointer;display:flex;align-items:center;gap:4px;" title="Retry"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg> Retry Failed Upload</span>';
                    timeEl.onclick = () => {
                        timeEl.innerHTML = `<span style="display:flex;align-items:center;gap:4px;color:#94a3b8;font-size:11px;">
                            <div class="lc-loader" style="width:10px;height:10px;border:2px solid #cbd5e1;border-top:2px solid transparent;border-radius:50%;animation:spin 1s linear infinite;"></div>
                            ${formatTime(new Date().toISOString())}
                        </span>`;
                        doUploadFile(fObj, tempId, fileUrl);
                    };
                }
            }
        }
    }

    async function sendMsg() {
        const inputEl = document.getElementById('lc-input');
        if (inputEl && inputEl.disabled) return;

        const txt = inputEl.value.trim();
        const pendingFiles = selectedFilesInfo.filter(x => x.status === 'pending' || x.status === 'failed');

        if (!txt && pendingFiles.length === 0) return;
        if (!ws) return;

        const currentPage = window.location.href;

        inputEl.value = '';
        inputEl.style.height = '40px';

        selectedFilesInfo = [];
        renderFilePreview();

        if (pendingFiles.length === 0) {
            ws.send(JSON.stringify({ message: txt, current_page: currentPage }));
        } else if (pendingFiles.length === 1) {
            pendingFiles[0].msg = txt;

            const fObj = pendingFiles[0];
            const fileUrl = URL.createObjectURL(fObj.file);
            const tempId = 'temp-' + fObj.id;

            addMsg({
                id: tempId,
                sender: 'visitor',
                senderName: 'You',
                text: fObj.msg || '',
                filePath: fileUrl,
                fileNameRaw: fObj.file.name,
                createdAt: new Date().toISOString(),
                isUploading: true
            });

            await doUploadFile(fObj, tempId, fileUrl);
        } else {
            // First display ALL buffering structures in DOM sequentially instantly
            const tasks = pendingFiles.map(fObj => {
                fObj.msg = '';
                const fileUrl = URL.createObjectURL(fObj.file);
                const tempId = 'temp-' + fObj.id;

                addMsg({
                    id: tempId,
                    sender: 'visitor',
                    senderName: 'You',
                    text: '',
                    filePath: fileUrl,
                    fileNameRaw: fObj.file.name,
                    createdAt: new Date().toISOString(),
                    isUploading: true
                });

                return { fObj, tempId, fileUrl };
            });

            let textTempId = null;
            if (txt) {
                textTempId = 'temp-txt-' + Date.now();
                addMsg({
                    id: textTempId,
                    sender: 'visitor',
                    senderName: 'You',
                    text: txt,
                    createdAt: new Date().toISOString(),
                    isUploading: true
                });
            }

            // Then execute the payloads over the network strictly consecutively
            for (const task of tasks) {
                await doUploadFile(task.fObj, task.tempId, task.fileUrl);
            }
            if (txt) {
                const tempEl = document.getElementById('msg-' + textTempId);
                if (tempEl) tempEl.remove(); // Safely remove dummy to be replaced natively by ws echo
                ws.send(JSON.stringify({ message: txt, current_page: currentPage }));
            }
        }
    }

    function formatTime(dateString) {
        const d = dateString ? new Date(dateString) : new Date();
        let hours = d.getHours();
        let minutes = d.getMinutes();
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12 || 12;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        return hours + ':' + minutes + ' ' + ampm;
    }

    window.lcPauseAllMedia = function (except) {
        if (audio && audio !== except && !audio.paused) audio.pause();
        const allMedia = document.querySelectorAll('#lc-messages audio, #lc-messages video');
        allMedia.forEach(m => {
            if (m !== except && !m.paused) {
                m.pause();
                if (m.tagName === 'AUDIO') {
                    const playBtn = m.previousElementSibling;
                    if (playBtn && playBtn.querySelector('path')) {
                        playBtn.querySelector('path').setAttribute('d', "M8 5v14l11-7z");
                    }
                }
            }
        });
    };

    function addMsg(m, isHistory = false, targetContainer = null) {
        const msgsContainer = targetContainer || document.getElementById('lc-messages');
        if (!msgsContainer) return;
        const existing = m.id ? document.getElementById(`msg-${m.id}`) : null;
        if (existing) return; // Prevent duplicates

        const msgTime = formatTime(m.createdAt);
        const currentName = m.sender === 'admin' ? (m.senderName || 'Agent') : 'You';

        let isGrouped = false;
        const msgNodes = msgsContainer ? msgsContainer.querySelectorAll('.lc-message:not(#sys-chat-status)') : [];
        const lastMsg = msgNodes.length > 0 ? msgNodes[msgNodes.length - 1] : null;

        if (lastMsg && lastMsg.classList.contains(m.sender)) {
            const lastName = lastMsg.getAttribute('data-sender-name');
            const lastT = lastMsg.getAttribute('data-msg-time');
            if (lastName === currentName && lastT === msgTime) {
                isGrouped = true;
                if (lastMsg.classList.contains('single')) {
                    lastMsg.classList.replace('single', 'group-first');
                } else if (lastMsg.classList.contains('group-last')) {
                    lastMsg.classList.replace('group-last', 'group-middle');
                }
            }
        }

        const d = document.createElement('div');
        const stateClass = isGrouped ? 'group-last' : 'single';
        const onlyFileClass = (!m.text && m.filePath) ? 'only-file' : '';
        const hasFileClass = m.filePath ? 'has-file' : '';
        d.className = `lc-message ${m.sender} ${stateClass} ${onlyFileClass} ${hasFileClass}`.trim();
        if (m.id) d.id = `msg-${m.id}`;
        d.setAttribute('data-sender-name', currentName);
        d.setAttribute('data-msg-time', msgTime);

        const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

        let avatarSrc = defaultAvatar;
        if (m.profilePic && typeof m.profilePic === 'string') {
            avatarSrc = m.profilePic.replace(/['"]/g, '').trim();
            if (avatarSrc.includes('http')) {
                avatarSrc = avatarSrc.substring(avatarSrc.indexOf('http'));
            }
        }

        let fileHtml = '';
        if (m.filePath) {
            const isImg = /\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i.test(m.filePath);
            const isAudio = /\.(mp3|wav|ogg|aac|m4a|weba)(\?.*)?$/i.test(m.filePath) || /voice_record_/i.test(m.filePath);
            const isVideo = /\.(mp4|webm|avi|mov)(\?.*)?$/i.test(m.filePath) && !isAudio;

            const fileName = m.fileNameRaw || (m.filePath ? m.filePath.split('/').pop().split('?')[0] : 'Document');
            if (isImg) {
                const imgWrapAttrs = m.isUploading ? '' : `onmouseenter="this.querySelector('.lc-img-overlay').style.opacity=1" onmouseleave="this.querySelector('.lc-img-overlay').style.opacity=0"`;
                const loaderOverlay = m.isUploading ? `<div style="position: absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.5); z-index: 5;"><div class="lc-loader" style="width:32px;height:32px;border:3px solid #3b82f6;border-top:3px solid transparent;border-radius:50%;animation:spin 1s linear infinite;"></div></div>` : '';
                fileHtml = `
                    <div class="lc-media-wrapper" style="position: relative; overflow: hidden; max-width: 100%; display: flex;" ${imgWrapAttrs}>
                        ${loaderOverlay}
                        <img src="${m.filePath}" style="width: 100%; display: block; cursor: pointer;" onclick="if(this.requestFullscreen) this.requestFullscreen(); else if(this.webkitRequestFullscreen) this.webkitRequestFullscreen();" />
                        ${m.isUploading ? '' : `
                        <div class="lc-img-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; transition: opacity 0.2s; pointer-events: none;">
                            <div style="position: absolute; bottom: 6px; right: 6px; pointer-events: auto;">
                                <div tabindex="0" style="color: white; background: rgba(0,0,0,0.5); border-radius: 50%; width: 28px; height: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; position: relative;" onclick="var m=this.nextElementSibling; m.style.display = m.style.display==='block'?'none':'block';" onblur="setTimeout(()=>this.nextElementSibling.style.display='none', 200)">
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                                </div>
                                <div style="display: none; position: absolute; bottom: 100%; right: 0; background: white; color: #0f172a; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 4px; margin-bottom: 4px; white-space: nowrap; z-index: 10;">
                                    <a href="${m.filePath}" download target="_blank" style="text-decoration: none; color: inherit; display: flex; align-items: center; gap: 8px; padding: 6px 12px; font-size: 13px; border-radius: 4px; cursor: pointer;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> Download
                                    </a>
                                </div>
                            </div>
                        </div>`}
                    </div>`;
            } else if (isAudio) {
                const isVisitor = m.sender === 'visitor';
                const iconBg = isVisitor ? 'rgba(255,255,255,0.2)' : '#eff6ff';
                const iconColor = isVisitor ? '#ffffff' : '#334155';
                const trackBg = isVisitor ? 'rgba(255,255,255,0.4)' : '#cbd5e1';
                const playPath = "M8 5v14l11-7z";
                const pausePath = "M6 19h4V5H6v14zm8-14v14h4V5h-4z";
                const waveId = 'lc-wave-' + (m.id || Math.random().toString(36).substr(2, 9));

                // Generate a unique fallback wave pattern based on file string to prevent CORS fetch errors entirely
                const seedStr = m.id + '' || m.filePath || Date.now().toString();
                let seed = 0;
                for (let i = 0; i < seedStr.length; i++) {
                    seed = ((seed << 5) - seed) + seedStr.charCodeAt(i);
                    seed = seed & seed; // Convert to 32bit int
                }
                seed = Math.abs(seed);

                const numBars = 38;
                const heights = new Array(numBars).fill(0).map((_, i) => {
                    const pct = i / (numBars - 1);
                    const env = Math.sin(pct * Math.PI); // Envelope to taper ends (0 -> 1 -> 0)

                    const noise = Math.abs(Math.sin(i * 13.73 + seed) * 10000 % 1);
                    const wave = Math.sin(pct * 15 + seed * 0.1) * 0.5 + 0.5;

                    const combined = wave * 0.3 + noise * 0.7;
                    let h = 10 + (combined * 90 * Math.pow(env, 0.7));
                    return Math.max(12, Math.min(100, Math.round(h)));
                });

                const baseBars = heights.map(h => `<div style="width: 2.5px; flex-shrink: 0; background: ${trackBg}; height: ${h}%; border-radius: 10px; transition: height 0.4s ease;"></div>`).join('');
                const activeBars = heights.map(h => `<div style="width: 2.5px; flex-shrink: 0; background: ${iconColor}; height: ${h}%; border-radius: 10px; transition: height 0.4s ease;"></div>`).join('');

                fileHtml = `
                    <div style="display: flex; align-items: center; gap: 12px; padding: 4px;">
                        <div onclick="var a=this.nextElementSibling; var p=this.querySelector('path'); if(a.paused){var pr=a.play(); if(pr!==undefined){pr.then(()=>p.setAttribute('d', '${pausePath}')).catch(e=>console.log(e));}else{p.setAttribute('d', '${pausePath}');}}else{a.pause(); p.setAttribute('d', '${playPath}');}" style="cursor: pointer; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; background: ${iconBg}; color: ${iconColor}; flex-shrink: 0; transition: transform 0.1s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="${playPath}"/></svg>
                        </div>
                        <audio preload="metadata" src="${m.filePath}" style="display: none;" onplay="window.lcPauseAllMedia(this)" ontimeupdate="var p=(this.currentTime/this.duration)*100||0; this.nextElementSibling.querySelector('.lc-audio-active-track').style.width=Math.min(p,100)+'%'; var t=this.nextElementSibling.querySelector('.lc-audio-current-time'); if(t && this.duration){var rem=this.duration-this.currentTime; var s=Math.floor(rem%60); var mt=Math.floor(rem/60); t.innerText=(mt<10?'0':'')+mt+':'+(s<10?'0':'')+s;}" onended="this.previousElementSibling.querySelector('path').setAttribute('d', '${playPath}'); this.nextElementSibling.querySelector('.lc-audio-active-track').style.width='0%'; var t=this.nextElementSibling.querySelector('.lc-audio-current-time'); if(t && this.duration){var s=Math.floor(this.duration%60); var mt=Math.floor(this.duration/60); t.innerText=(mt<10?'0':'')+mt+':'+(s<10?'0':'')+s;}" onloadedmetadata="var t=this.nextElementSibling.querySelector('.lc-audio-current-time'); if(t && this.duration){var s=Math.floor(this.duration%60); var mt=Math.floor(this.duration/60); t.innerText=(mt<10?'0':'')+mt+':'+(s<10?'0':'')+s;}"></audio>
                        <div style="display: flex; flex-direction: column; width: 170px; justify-content: center; gap: 4px;">
                            <div id="${waveId}" style="width: 100%; height: 32px; position: relative; cursor: pointer;" onclick="var a=this.parentElement.previousElementSibling; var r=this.getBoundingClientRect(); if(a.duration) a.currentTime=((event.clientX-r.left)/r.width)*a.duration;">
                                <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: space-between; pointer-events: none;">
                                    ${baseBars}
                                </div>
                                <div class="lc-audio-active-track" style="position: absolute; left: 0; top: 0; height: 100%; width: 0%; overflow: hidden; pointer-events: none;">
                                    <div style="width: 170px; height: 100%; display: flex; align-items: center; justify-content: space-between;">
                                        ${activeBars}
                                    </div>
                                </div>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 11px; color: ${iconColor}; opacity: 0.8; font-weight: 500;">
                                <span class="lc-audio-current-time">00:00</span>
                            </div>
                        </div>
                    </div>`;
            } else if (isVideo) {
                const vidWrapAttrs = m.isUploading ? '' : `onmouseenter="this.querySelector('.lc-vid-overlay').style.opacity=1" onmouseleave="this.querySelector('.lc-vid-overlay').style.opacity=0"`;
                const loaderOverlay = m.isUploading ? `<div style="position: absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.5); z-index: 5;"><div class="lc-loader" style="width:32px;height:32px;border:3px solid #3b82f6;border-top:3px solid transparent;border-radius:50%;animation:spin 1s linear infinite;"></div></div>` : '';
                fileHtml = `
                    <div class="lc-media-wrapper" style="position: relative; overflow: hidden; max-width: 100%; display: flex;" ${vidWrapAttrs}>
                        ${loaderOverlay}
                        <video src="${m.filePath}" style="width: 100%; max-height: 250px; object-fit: cover; display: block; background: #000; cursor: pointer;" preload="metadata" onclick="this.paused ? this.play() : this.pause()" onplay="window.lcPauseAllMedia(this); if(!${m.isUploading}) this.nextElementSibling.style.display='none'" onpause="if(!${m.isUploading}) this.nextElementSibling.style.display='flex'" onended="if(!${m.isUploading}) this.nextElementSibling.style.display='flex'" onloadedmetadata="let s=Math.floor(this.duration%60);let m=Math.floor(this.duration/60); this.parentElement.querySelector('.lc-vid-duration').innerText=(m<10?'0':'')+m+':'+(s<10?'0':'')+s;"></video>
                        ${m.isUploading ? '' : `
                        <div onclick="this.previousElementSibling.play()" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 44px; height: 44px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: white;">
                            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" style="margin-left: 3px;"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                        <div class="lc-vid-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; transition: opacity 0.2s; pointer-events: none;">
                            <div title="Full Screen" onclick="var v=this.parentElement.parentElement.querySelector('video'); if(v.requestFullscreen) v.requestFullscreen(); else if(v.webkitRequestFullscreen) v.webkitRequestFullscreen();" style="position: absolute; top: 6px; right: 6px; color: white; background: rgba(0,0,0,0.5); border-radius: 6px; padding: 4px; pointer-events: auto; cursor: pointer; display: flex;">
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                            </div>
                            <div class="lc-vid-duration" style="position: absolute; bottom: 8px; left: 8px; color: white; background: rgba(0,0,0,0.5); border-radius: 12px; padding: 2px 8px; font-size: 11px; font-weight: 500; pointer-events: none; letter-spacing: 0.5px;">--:--</div>
                            <div style="position: absolute; bottom: 6px; right: 6px; pointer-events: auto;">
                                <div tabindex="0" style="color: white; background: rgba(0,0,0,0.5); border-radius: 50%; width: 28px; height: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; position: relative;" onclick="var m=this.nextElementSibling; m.style.display = m.style.display==='block'?'none':'block';" onblur="setTimeout(()=>this.nextElementSibling.style.display='none', 200)">
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                                </div>
                                <div style="display: none; position: absolute; bottom: 100%; right: 0; background: white; color: #0f172a; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 4px; margin-bottom: 4px; white-space: nowrap; z-index: 10;">
                                    <a href="${m.filePath}" download target="_blank" style="text-decoration: none; color: inherit; display: flex; align-items: center; gap: 8px; padding: 6px 12px; font-size: 13px; border-radius: 4px; cursor: pointer;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> Download
                                    </a>
                                </div>
                            </div>
                        </div>`}
                    </div>`;
            } else {
                const fileExt = fileName.includes('.') ? fileName.split('.').pop().toUpperCase() : 'FILE';
                const isVisitor = m.sender === 'visitor';
                const iconBg = isVisitor ? 'rgba(255,255,255,0.2)' : '#eff6ff';
                const iconColor = isVisitor ? '#ffffff' : '#3b82f6';
                const borderColor = isVisitor ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)';

                if (!window.lcDownloadFile) {
                    window.lcDownloadFile = async function (e, url, filename) {
                        e.stopPropagation();
                        e.preventDefault();
                        const btn = e.currentTarget;
                        if (btn.dataset.downloading === "true") return;
                        btn.dataset.downloading = "true";

                        const originalContent = btn.innerHTML;
                        btn.innerHTML = `
                            <svg viewBox="0 0 36 36" width="24" height="24" style="transform: rotate(-90deg);">
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="100, 100" stroke-opacity="0.2" />
                                <path class="lc-progress-circle" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="0, 100" stroke-linecap="round" style="transition: stroke-dasharray 0.1s;" />
                            </svg>
                        `;

                        try {
                            const response = await fetch(url);
                            if (!response.ok) throw new Error('Network response was not ok');

                            const contentLength = response.headers.get('content-length');
                            const total = contentLength ? parseInt(contentLength, 10) : 0;
                            let loaded = 0;

                            const chunks = [];
                            if (total > 0 && response.body) {
                                const reader = response.body.getReader();
                                while (true) {
                                    const { done, value } = await reader.read();
                                    if (done) break;
                                    chunks.push(value);
                                    loaded += value.length;
                                    const progress = Math.min((loaded / total) * 100, 100);
                                    const circle = btn.querySelector('.lc-progress-circle');
                                    if (circle) circle.setAttribute('stroke-dasharray', progress + ', 100');
                                }
                            } else {
                                const blob = await response.blob();
                                chunks.push(blob);
                            }

                            const blob = new Blob(chunks);
                            const blobUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.download = filename;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                        } catch (error) {
                            console.error('Download failed:', error);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = filename;
                            a.target = '_blank';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                        } finally {
                            btn.innerHTML = originalContent;
                            btn.dataset.downloading = "false";
                        }
                    };
                }

                if (!window.lcViewFile) {
                    window.lcViewFile = async function (e, url, ext) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (ext === 'pdf') {
                            const newTab = window.open('', '_blank');
                            if (newTab) {
                                newTab.document.write('<div style="font-family: sans-serif; padding: 20px; color: #333;">Loading PDF preview...</div>');
                                try {
                                    const res = await fetch(url);
                                    if (!res.ok) throw new Error('Network response was not ok');
                                    const blob = await res.blob();
                                    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
                                    const blobUrl = URL.createObjectURL(pdfBlob);
                                    newTab.location.href = blobUrl;
                                } catch (error) {
                                    console.error('PDF Preview failed:', error);
                                    newTab.location.href = url;
                                }
                            } else {
                                window.open(url, '_blank');
                            }
                        } else {
                            window.open(url, '_blank');
                        }
                    };
                }

                let viewUrl = m.filePath;
                const ext = fileExt.toLowerCase();
                if (['xlsx', 'xls', 'doc', 'docx', 'ppt', 'pptx'].includes(ext)) {
                    viewUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(m.filePath)}&wdOrigin=BROWSELINK`;
                }

                const actionHtml = m.isUploading
                    ? `<div style="display:flex;align-items:center;justify-content:center;padding:6px;margin-right:2px;"><div class="lc-loader" style="width:16px;height:16px;border:2px solid ${iconColor};border-top:2px solid transparent;border-radius:50%;animation:spin 1s linear infinite;"></div></div>`
                    : `<div onclick="window.lcDownloadFile(event, '${m.filePath}', '${fileName}')" title="Download" style="color: ${iconColor}; display: flex; align-items: center; justify-content: center; padding: 6px; border-radius: 50%; opacity: 0.9; cursor: pointer; transition: transform 0.1s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                       </div>`;

                const hoverAttr = m.isUploading ? '' : `onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1" onclick="window.lcViewFile(event, '${viewUrl}', '${ext}')"`;

                fileHtml = `
                    <div class="lc-media-wrapper" style="display: flex; align-items: center; background: transparent; padding: 8px; border: 1px solid ${borderColor}; gap: 12px; cursor: ${m.isUploading ? 'default' : 'pointer'}; transition: opacity 0.2s; text-decoration: none; color: inherit;" ${hoverAttr}>
                        <div style="background: ${iconBg}; width: 40px; height: 40px; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: ${iconColor};">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                        </div>
                        <div style="flex: 1; min-width: 0; text-align: left; position: relative;" onmouseenter="this.querySelector('.lc-file-tooltip').style.opacity=1;this.querySelector('.lc-file-tooltip').style.visibility='visible';this.querySelector('.lc-file-tooltip').style.transform='translateY(0)';" onmouseleave="this.querySelector('.lc-file-tooltip').style.opacity=0;this.querySelector('.lc-file-tooltip').style.visibility='hidden';this.querySelector('.lc-file-tooltip').style.transform='translateY(8px)';">
                            <div style="font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">${fileName}</div>
                            <div class="lc-file-tooltip" style="position: absolute; bottom: 100%; ${isVisitor ? 'right: -20px;' : 'left: -10px;'} background: #1e293b; color: white; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 500; word-break: break-all; max-width: 220px; width: max-content; opacity: 0; visibility: hidden; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); transform: translateY(8px); z-index: 50; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.05); pointer-events: none; margin-bottom: 8px; text-align: left; line-height: 1.3;">${fileName}</div>
                            <div style="font-size: 11px; opacity: 0.8; margin-top: 4px; text-transform: uppercase;">${fileExt} Document</div>
                        </div>
                        ${actionHtml}
                    </div>`;
            }
        }

        const textPadding = m.filePath ? 'padding: 2px 6px 4px 6px; margin-top: 4px;' : '';
        const textHtml = m.text ? `<div style="${textPadding} white-space: pre-wrap;">${m.text}</div>` : '';

        let timeDisplay = msgTime;
        if (m.isUploading) {
            timeDisplay = `<span style="display:flex;align-items:center;gap:4px;color:#94a3b8;font-size:11px;">
                <div class="lc-loader" style="width:10px;height:10px;border:2px solid #cbd5e1;border-top:2px solid transparent;border-radius:50%;animation:spin 1s linear infinite;"></div>
                ${msgTime}
            </span>`;
        }

        d.innerHTML = `
            ${!isGrouped ? `<div class="lc-msg-meta">${currentName}</div>` : ''}
            <div class="lc-msg-row">
                ${m.sender === 'admin' ? `<img class="lc-avatar" src="${avatarSrc}" alt="Avatar" />` : ''}
                <div class="lc-msg-bubble">${fileHtml}${textHtml}</div>
                <div class="lc-msg-time">${timeDisplay}</div>
            </div>
        `;
        msgsContainer.appendChild(d);

        // Keep status log at the very bottom
        if (msgsContainer.id === 'lc-messages') {
            const statusLog = document.getElementById('sys-chat-status');
            if (statusLog) {
                if (m.sender === 'admin' && statusLog.innerText.includes("Waiting")) {
                    statusLog.remove();
                } else {
                    msgsContainer.appendChild(statusLog);
                }
            }
            if (!isHistory || (isHistory && chatPage === 1 && !targetContainer)) {
                msgsContainer.scrollTop = msgsContainer.scrollHeight;
            }
        }

        // Badge update
        const win = document.getElementById('lc-window');
        if (!isHistory && m.sender === 'admin' && win && !win.classList.contains('open')) {
            unreadCount++;
            d.classList.add('lc-unread-item');
            updateBadge();
        }
    }

    function addSysMsg(txt, id = null) {
        const msgsContainer = document.getElementById('lc-messages');
        if (id) {
            const existing = document.getElementById(id);
            if (existing) {
                existing.innerHTML = txt;
                msgsContainer.appendChild(existing); // Bring to front/bottom
                msgsContainer.scrollTop = msgsContainer.scrollHeight;
                return;
            }
        }
        const d = document.createElement('div');
        if (id) d.id = id;

        let displayTxt = txt || "";
        if (displayTxt.includes(" by ")) {
            displayTxt = displayTxt.split(" by ")[0];
        }

        d.style.textAlign = 'center'; d.style.fontSize = '12px'; d.style.color = '#94a3b8';
        d.style.margin = '10px 0'; d.style.lineHeight = '1.6';
        d.innerHTML = displayTxt;
        
        // Ensure all links in system messages open in new tab
        const links = d.querySelectorAll('a');
        links.forEach(link => {
            link.setAttribute('target', '_blank');
            link.style.color = '#3b82f6';
            link.style.textDecoration = 'underline';
            link.style.fontWeight = '600';
        });

        msgsContainer.appendChild(d);
        msgsContainer.scrollTop = msgsContainer.scrollHeight;
    }

    function handleChatStatus(status, customMsg = null) {
        if (!status) return;
        status = String(status).toLowerCase();

        const inputEl = document.getElementById('lc-input');
        const sendBtn = document.getElementById('lc-send-btn');
        const inputArea = document.getElementById('lc-input-area');
        const closedNotice = document.getElementById('lc-closed-notice');
        const previewArea = document.getElementById('lc-file-preview-area');
        const plusMenu = document.getElementById('lc-plus-menu');
        const hasAdminMsg = document.querySelector('.lc-message.admin');

        let msg = "";
        const isClosed = (status === 'closed' || status === 'close');
        const isConverted = (status === 'converted');
        const isClosedOrConverted = isClosed || isConverted;

        const feedbackNotice = document.getElementById('lc-feedback-notice');

        if (status === 'created') {
            if (!hasAdminMsg) {
                msg = "Waiting for an agent to accept the chat...";
            }
        }

        if (inputArea) inputArea.style.display = isClosedOrConverted ? 'none' : 'flex';
        if (previewArea && isClosedOrConverted) previewArea.style.display = 'none';
        if (plusMenu && isClosedOrConverted) plusMenu.classList.remove('open');

        if (closedNotice) {
            closedNotice.style.display = isClosedOrConverted ? 'block' : 'none';
            if (isConverted) {
                closedNotice.innerText = "This chat was converted to a support ticket";
            } else if (isClosed) {
                closedNotice.innerText = "This chat was closed";
            }
        }

        if (isClosedOrConverted) {
            // Cleanup WebSocket and session
            if (ws) {
                ws.onclose = null; // Prevent reconnect
                ws.close();
                ws = null;
            }
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }
            
            sessionData.active = false;
            localStorage.setItem('lc_data', JSON.stringify(sessionData));
            localStorage.removeItem('lc_chat_id');
            chatId = null;

            // Automatically switch to feedback if not already there
            const chatView = document.getElementById('lc-view-chat');
            const waitView = document.getElementById('lc-view-waiting');
            if (chatView.style.display === 'flex' || waitView.style.display === 'flex') {
                const msgsContainer = document.getElementById('lc-messages');
                if (msgsContainer) msgsContainer.innerHTML = '';

                // Reset Feedback form
                rating = 0;
                document.querySelectorAll('.lc-star').forEach(st => st.classList.remove('active'));
                document.getElementById('lc-feedback-comment').value = '';
                const transcriptCheckbox = document.getElementById('lc-send-transcript');
                if (transcriptCheckbox) transcriptCheckbox.checked = false;

                setView('feedback');
                if (feedbackNotice) {
                    feedbackNotice.style.display = 'block';
                    feedbackNotice.innerHTML = customMsg;
                    
                    // Format links inside feedback notice
                    feedbackNotice.querySelectorAll('a').forEach(link => {
                        link.setAttribute('target', '_blank');
                        link.style.color = '#2563eb';
                        link.style.textDecoration = 'underline';
                        link.style.fontWeight = '700';
                    });
                }
            }
        } else if (feedbackNotice) {
            feedbackNotice.style.display = 'none';
        }
        
        if (inputEl) inputEl.disabled = isClosedOrConverted;
        if (sendBtn) sendBtn.disabled = isClosedOrConverted;

        if (msg) {
            addSysMsg(msg, 'sys-chat-status');
        } else {
            const existingLog = document.getElementById('sys-chat-status');
            if (existingLog && (existingLog.innerText.includes("Waiting") || existingLog.innerText.includes("closed") || existingLog.innerText.includes("converted"))) {
                existingLog.remove();
            }
        }
    }

    // UI Toggles
    const win = document.getElementById('lc-window');
    const bub = document.getElementById('lc-bubble');
    const msgsContainer = document.getElementById('lc-messages');
    const scrollDownBtn = document.getElementById('lc-scroll-down');

    if (msgsContainer && scrollDownBtn) {
        msgsContainer.addEventListener('scroll', () => {
            const isNearBottom = msgsContainer.scrollHeight - msgsContainer.scrollTop - msgsContainer.clientHeight < 50;
            scrollDownBtn.style.display = isNearBottom ? 'none' : 'flex';

            if (msgsContainer.scrollTop === 0 && hasMoreChats && !isLoadingChats) {
                chatPage++;
                loadPreviousChats(chatId, chatPage);
            }
        });
        scrollDownBtn.addEventListener('click', () => {
            msgsContainer.scrollTo({ top: msgsContainer.scrollHeight, behavior: 'smooth' });
        });
    }

    bub.addEventListener('click', () => {
        win.classList.add('open');
        bub.style.display = 'none';

        const existingDivider = document.getElementById('lc-unread-divider');
        if (existingDivider) existingDivider.remove();

        if (unreadCount > 0) {
            const firstUnread = document.querySelector('.lc-unread-item');
            if (firstUnread) {
                const divider = document.createElement('div');
                divider.id = 'lc-unread-divider';
                divider.innerHTML = `<span>${unreadCount} UNREAD MESSAGE${unreadCount > 1 ? 'S' : ''}</span>`;
                divider.style.textAlign = 'center';
                divider.style.margin = '15px 0 5px 0';
                divider.style.fontSize = '11px';
                divider.style.color = '#3b82f6';
                divider.style.background = '#eff6ff';
                divider.style.padding = '4px 10px';
                divider.style.borderRadius = '10px';
                divider.style.fontWeight = '600';
                divider.style.alignSelf = 'center';
                divider.style.textTransform = 'uppercase';
                divider.style.letterSpacing = '0.5px';

                firstUnread.parentNode.insertBefore(divider, firstUnread);
            }
        }

        document.querySelectorAll('.lc-unread-item').forEach(el => el.classList.remove('lc-unread-item'));
        unreadCount = 0;
        updateBadge();

        if (msgsContainer) msgsContainer.scrollTop = msgsContainer.scrollHeight;
    });

    document.getElementById('lc-minimize').addEventListener('click', () => {
        win.classList.remove('open');
        bub.style.display = 'flex';
        const existingDivider = document.getElementById('lc-unread-divider');
        if (existingDivider) existingDivider.remove();
    });

    // End Chat
    document.getElementById('lc-end-chat').addEventListener('click', () => {
        showToast('End this chat?', 'confirm', () => {
            if (chatId) {
                fetch(`${baseUrl}/api/v1/client/chatbot/chat/${chatId}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'closed' })
                }).catch(err => console.error('Error closing chat:', err));
            }
            sessionData.active = false;
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
                reconnectTimeout = null;
            }
            if (ws) {
                ws.onclose = null; // Prevent reconnect
                ws.close();
                ws = null;
            }
            localStorage.setItem('lc_data', JSON.stringify(sessionData));
            localStorage.removeItem('lc_chat_id');
            chatId = null;
            document.getElementById('lc-messages').innerHTML = '';

            // Reset Feedback form
            rating = 0;
            document.querySelectorAll('.lc-star').forEach(st => st.classList.remove('active'));
            document.getElementById('lc-feedback-comment').value = '';
            const transcriptCheckbox = document.getElementById('lc-send-transcript');
            if (transcriptCheckbox) transcriptCheckbox.checked = false;

            setView('feedback');
        });
    });

    // Feedback
    let rating = 0;
    document.querySelectorAll('.lc-star').forEach(s => {
        s.addEventListener('click', () => {
            rating = s.dataset.v;
            document.querySelectorAll('.lc-star').forEach(st => st.classList.toggle('active', st.dataset.v <= rating));
        });
    });
    document.getElementById('lc-submit-feedback').addEventListener('click', (e) => { // Added 'e' here
        e.preventDefault();
        e.stopPropagation();
        showToast('Feedback Sent', 'success');
        localStorage.removeItem('lc_data');
        localStorage.removeItem('lc_chat_id');

        // Reset Feedback state
        rating = 0;
        document.querySelectorAll('.lc-star').forEach(st => st.classList.remove('active'));
        document.getElementById('lc-feedback-comment').value = '';
        const transcriptCheckbox = document.getElementById('lc-send-transcript');
        if (transcriptCheckbox) transcriptCheckbox.checked = false;
        const feedbackNotice = document.getElementById('lc-feedback-notice');
        if (feedbackNotice) feedbackNotice.style.display = 'none';

        // Reset Form inputs
        document.getElementById('lc-name').value = '';
        document.getElementById('lc-email').value = '';
        document.getElementById('lc-dept').value = '';
        const deptText = document.getElementById('lc-dept-text');
        if (deptText) {
            deptText.textContent = 'Select Department';
            deptText.style.color = '#cbd5e1';
        }
        document.getElementById('lc-desc').value = '';

        setView('form');
    });
    document.getElementById('lc-skip-feedback').addEventListener('click', (e) => { // Added 'e' here
        e.preventDefault();
        e.stopPropagation();
        localStorage.removeItem('lc_data');
        localStorage.removeItem('lc_chat_id');

        // Reset Form inputs
        document.getElementById('lc-name').value = '';
        document.getElementById('lc-email').value = '';
        document.getElementById('lc-dept').value = '';
        const deptText = document.getElementById('lc-dept-text');
        if (deptText) {
            deptText.textContent = 'Select Department';
            deptText.style.color = '#cbd5e1';
        }
        document.getElementById('lc-desc').value = '';
        const transcriptCheckbox = document.getElementById('lc-send-transcript');
        if (transcriptCheckbox) transcriptCheckbox.checked = false;
        const feedbackNotice = document.getElementById('lc-feedback-notice');
        if (feedbackNotice) feedbackNotice.style.display = 'none';

        setView('form');
    });
    document.getElementById('lc-email-transcript').addEventListener('click', () => {
        showToast('Transcript request to be implemented.', 'info');
    });

    function logVisitorInfo() {
        const userAgent = navigator.userAgent;
        const platform = navigator.platform;

        const browser = (() => {
            const ua = navigator.userAgent;
            if (ua.includes("Edg/")) return "Microsoft Edge";
            if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
            if (ua.includes("Brave")) return "Brave";
            if (ua.includes("Chrome") && !ua.includes("Edg/")) return "Chrome";
            if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
            if (ua.includes("Firefox")) return "Firefox";
            return "Unknown";
        })();

        const os = (() => {
            if (platform.includes("Win")) return "Windows";
            if (platform.includes("Mac")) return "MacOS";
            if (platform.includes("Linux")) return "Linux";
            if (/Android/.test(userAgent)) return "Android";
            if (/iPhone|iPad|iPod/.test(userAgent)) return "iOS";
            return "Unknown";
        })();

        visitorInfo.browser = browser;
        visitorInfo.device = os;
        visitorInfo.current_page = window.location.href;

        fetch("https://get.geojs.io/v1/ip/geo.json")
            .then(res => res.json())
            .then(data => {
                if (data && data.ip) {
                    visitorInfo.ip_address = data.ip;
                    visitorInfo.country = data.country;
                }
            })
            .catch(err => console.log("IP lookup failed", err));
    }

    init();

})();