const CONFIG = {
    CHECK_INTERVAL: 5 * 60 * 1000,
    MAX_FILE_SIZE_FOR_HASH: 10 * 1024 * 1024,
    DANGEROUS_EXTENSIONS: [
        '.php', '.php3', '.php4', '.php5', '.phtml', '.phar',
        '.asp', '.aspx', '.ashx', '.asmx', '.cer',
        '.jsp', '.jspx', '.jsf', '.jsf2',
        '.sh', '.bash', '.zsh', '.csh', '.ksh',
        '.bat', '.cmd', '.ps1', '.vbs', '.wsf',
        '.exe', '.dll', '.so', '.dylib',
        '.cgi', '.pl', '.py', '.rb',
        '.htaccess', '.htpasswd', '.config'
    ],
    ALLOWED_EXTENSIONS: [
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx',
        '.txt', '.csv', '.json'
    ],
    MAX_FILENAME_LENGTH: 255,
    MALICIOUS_PATTERNS: [
        /<%.*%>/g,
        /<\?php/gi,
        /<script[^>]*>/gi,
        /eval\s*\(/gi,
        /exec\s*\(/gi,
        /system\s*\(/gi,
        /passthru\s*\(/gi,
        /shell_exec\s*\(/gi,
        /base64_decode\s*\(/gi,
        /\$_GET|\$_POST|\$_REQUEST/g,
        /document\.cookie/gi,
        /window\.location/gi
    ]
};

export {
    CONFIG
};
