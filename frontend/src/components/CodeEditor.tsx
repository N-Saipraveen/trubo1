import { useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { javascript } from '@codemirror/lang-javascript';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Copy, Download } from 'lucide-react';
import { Button } from './ui/button';
import { copyToClipboard, downloadFile } from '@/lib/utils';
import { toast } from 'sonner';

interface CodeEditorProps {
  title: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  language?: 'sql' | 'json';
  showActions?: boolean;
}

export function CodeEditor({
  title,
  value,
  onChange,
  readOnly = false,
  language = 'sql',
  showActions = true,
}: CodeEditorProps) {
  const { theme } = useStore();

  const extensions = language === 'sql' ? [sql()] : [javascript({ jsx: false, typescript: false })];

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(value);
    if (success) {
      toast.success('Copied to clipboard');
    } else {
      toast.error('Failed to copy');
    }
  }, [value]);

  const handleDownload = useCallback(() => {
    const ext = language === 'sql' ? 'sql' : 'json';
    const filename = `turbodbx-output.${ext}`;
    downloadFile(value, filename, language === 'sql' ? 'text/plain' : 'application/json');
    toast.success('Downloaded successfully');
  }, [value, language]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {showActions && value && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <div className="h-full overflow-auto rounded-b-lg">
          <CodeMirror
            value={value}
            height="100%"
            minHeight="400px"
            theme={theme === 'dark' ? 'dark' : 'light'}
            extensions={extensions}
            onChange={onChange}
            editable={!readOnly}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              highlightSpecialChars: true,
              foldGutter: true,
              dropCursor: true,
              allowMultipleSelections: true,
              indentOnInput: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              rectangularSelection: true,
              crosshairCursor: true,
              highlightActiveLine: true,
              highlightSelectionMatches: true,
              closeBracketsKeymap: true,
              searchKeymap: true,
              foldKeymap: true,
              completionKeymap: true,
              lintKeymap: true,
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
