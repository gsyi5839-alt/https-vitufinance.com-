export const SECURITY_CONFIG = {
    BOT_PATTERNS: {
        AGENTS: [
            /sqlmap/i, /nikto/i, /nmap/i, /masscan/i,
            /dirbuster/i, /gobuster/i, /wpscan/i,
            /nessus/i, /acunetix/i, /burpsuite/i,
            /zaproxy/i, /netsparker/i, /metasploit/i,
            /hydra/i, /medusa/i, /john/i
        ],
        PATHS: [
            /\.env$/i, /\.git\//i, /\.svn\//i,
            /wp-admin/i, /wp-login/i, /wp-content/i,
            /phpmyadmin/i, /adminer\.php/i, /phpinfo\.php/i,
            /shell\.php/i, /c99\.php/i, /r57\.php/i,
            /\.bak$/i, /\.old$/i, /\.orig$/i,
            /test\.php/i, /info\.php/i
        ]
    },

    TRUSTED_PROXIES: [
        '127.0.0.1',
        '::1',
        'localhost'
    ],

    EXCLUDED_PATHS: [
        '/health',
        '/api/health',
        '/favicon.ico'
    ],

    XSS_PATTERNS: [
        /<script[^>]*>/gi,
        /<\/script>/gi,
        /<script[\s\S]*?>/gi,

        /javascript\s*:/gi,
        /&#0*106;&#0*97;&#0*118;&#0*97;&#0*115;&#0*99;&#0*114;&#0*105;&#0*112;&#0*116;/gi,

        /on(abort|blur|change|click|dblclick|error|focus|keydown|keypress|keyup|load|mousedown|mousemove|mouseout|mouseover|mouseup|reset|resize|scroll|select|submit|unload)\s*=/gi,
        /on(animationend|animationiteration|animationstart|beforeunload|canplay|canplaythrough|contextmenu|copy|cut|drag|dragend|dragenter|dragleave|dragover|dragstart|drop|durationchange|ended|error|focus|focusin|focusout|fullscreenchange|fullscreenerror|hashchange|input|invalid|keydown|keypress|keyup|load|loadeddata|loadedmetadata|loadstart|message|mouseenter|mouseleave|offline|online|open|pagehide|pageshow|paste|pause|play|playing|popstate|progress|ratechange|resize|scroll|search|seeked|seeking|select|show|stalled|storage|submit|suspend|timeupdate|toggle|touchcancel|touchend|touchmove|touchstart|transitionend|unload|volumechange|waiting|wheel)\s*=/gi,

        /expression\s*\(/gi,
        /behavior\s*:/gi,
        /binding\s*:/gi,

        /vbscript\s*:/gi,

        /data:\s*text\/html/gi,
        /data:\s*application\/x-javascript/gi,
        /data:\s*text\/javascript/gi,

        /<svg[^>]*onload/gi,
        /<svg[^>]*onerror/gi,
        /<animate[^>]*onbegin/gi,
        /<set[^>]*onbegin/gi,

        /<object[^>]*>/gi,
        /<embed[^>]*>/gi,
        /<iframe[^>]*>/gi,
        /<frame[^>]*>/gi,

        /<form[^>]*action\s*=/gi,
        /<input[^>]*formaction\s*=/gi,
        /<button[^>]*formaction\s*=/gi,

        /<base[^>]*href\s*=/gi,

        /<meta[^>]*http-equiv\s*=\s*["']?refresh/gi,

        /<link[^>]*href\s*=\s*["']?javascript/gi,

        /style\s*=\s*["'][^"']*expression\s*\(/gi,
        /style\s*=\s*["'][^"']*url\s*\(\s*["']?javascript/gi,

        /\$\{[^}]*\}/g,

        /\{\{.*?\}\}/g,
        /\[\[.*?\]\]/g,

        /&#x0*6a;&#x0*61;&#x0*76;&#x0*61;&#x0*73;&#x0*63;&#x0*72;&#x0*69;&#x0*70;&#x0*74;/gi
    ]
};
