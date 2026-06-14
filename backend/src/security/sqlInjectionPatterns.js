export const SQL_INJECTION_PATTERNS = [
    /--\s*$/m,
    /\/\*[\s\S]*?\*\//,
    /#\s*$/m,

    /union\s+(all\s+)?select/i,
    /union\s+(all\s+)?distinct/i,

    /'\s*or\s+'1'\s*=\s*'1/i,
    /"\s*or\s+"1"\s*=\s*"1/i,
    /'\s*or\s+'a'\s*=\s*'a/i,
    /'\s*or\s+1\s*=\s*1/i,
    /'\s*or\s+true/i,
    /'\s*and\s+'1'\s*=\s*'1/i,
    /"\s*and\s+"1"\s*=\s*"1/i,
    /'\s*or\s+''='/i,
    /"\s*or\s+""="/i,
    /'\s*or\s+'x'\s*=\s*'x/i,
    /admin'\s*--/i,
    /'\s*;\s*--/i,

    /extractvalue\s*\(/i,
    /updatexml\s*\(/i,
    /floor\s*\(\s*rand/i,
    /exp\s*\(\s*~\s*\(/i,
    /xmltype\s*\(/i,
    /dbms_pipe/i,
    /utl_http/i,

    /sleep\s*\(\s*\d/i,
    /benchmark\s*\(\s*\d/i,
    /waitfor\s+delay/i,
    /pg_sleep/i,
    /dbms_lock\.sleep/i,

    /;\s*select\s+/i,
    /;\s*insert\s+/i,
    /;\s*update\s+/i,
    /;\s*delete\s+/i,
    /;\s*drop\s+/i,
    /;\s*create\s+/i,
    /;\s*alter\s+/i,
    /;\s*truncate\s+/i,
    /;\s*grant\s+/i,
    /;\s*revoke\s+/i,

    /information_schema/i,
    /sys\.(objects|tables|columns)/i,
    /mysql\.(user|db)/i,
    /pg_catalog/i,
    /all_tables/i,
    /user_tables/i,
    /v\$version/i,
    /@@version/i,
    /version\s*\(\s*\)/i,

    /group_concat\s*\(/i,
    /concat\s*\(/i,
    /concat_ws\s*\(/i,
    /load_file\s*\(/i,
    /into\s+outfile/i,
    /into\s+dumpfile/i,
    /bulk\s+insert/i,
    /openrowset/i,
    /opendatasource/i,

    /char\s*\(\s*\d/i,

    /convert\s*\(/i,
    /cast\s*\(/i,
    /substring\s*\(/i,
    /ascii\s*\(/i,
    /ord\s*\(/i,
    /mid\s*\(/i,
    /left\s*\(/i,
    /right\s*\(/i,

    /\$where\s*:/i,
    /\$gt\s*:/i,
    /\$ne\s*:/i,
    /\$regex\s*:/i,
    /\{\s*"\$[a-z]+"\s*:/i,

    /\)\s*\(\|/i,
    /\)\s*\(&/i,
    /\*\)\s*\(/i,

    /xp_cmdshell/i,
    /sp_oacreate/i,
    /xp_regread/i
];

export const HIGH_RISK_KEYWORDS = [
    'drop', 'truncate', 'delete', 'insert', 'update',
    'alter', 'grant', 'revoke', 'shutdown',
    'exec', 'execute', 'xp_', 'sp_'
];

export const DANGEROUS_OPERATORS = [
    'union', 'select', 'from', 'where', 'having',
    'group by', 'order by',
    'join', 'inner', 'outer'
];

const ETH_WALLET_REGEX = /^0x[0-9a-fA-F]{40}$/;

export function isEthWalletAddress(input) {
    return ETH_WALLET_REGEX.test(input);
}
