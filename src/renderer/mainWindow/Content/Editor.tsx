import { useCallback, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react';
import Monaco from 'monaco-editor';
import MonacoEditor from '@monaco-editor/react';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import TopBar from './TopBar';
import { Snippet } from '../../../@types/snippet';
import languages from './languages';
import { useStore } from '../../contextProvider/storeContext';
import './Content.scss';

interface IProps {
  editorTheme: 'light' | 'vs-dark';
}

const Editor = (props: IProps) => {
  const { editorTheme } = props;
  const store = useStore();
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const [lang, setLang] = useState('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [datetime, setDatetime] = useState(0);
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);

  const appStore = store?.appStore;
  const selectedSnippetId = store?.appStore.selectedSnippetId;
  const snippetsStore = store?.snippetsStore;
  const mode = appStore?.mode;

  useEffect(() => {
    if (mode === 'edit' && selectedSnippetId) {
      const snippets = snippetsStore?.snippets;
      const found = snippets?.find((i) => i.id === selectedSnippetId);
      if (found) {
        setTitle(found.title);
        setContent(found.content);
        setLang(found.lang);
        setDatetime(found.datetime);
        setSelectedSnippet(found);
      }
    }
  }, [mode, selectedSnippetId, snippetsStore]);

  const handleEditingTitle = (val: string) => {
    setTitle(val);
    appStore?.updateNewSnippetTitle(val.trim());
  };

  const handleSave = useCallback(async () => {
    let toastMsg = '';
    const newContent = editorRef.current?.getValue() || '';
    if (!title.trim()) {
      toast.error('Please enter a snippet title', {
        position: toast.POSITION.BOTTOM_CENTER,
      });
      return false;
    }
    if (mode === 'new') {
      const saved = await snippetsStore?.add({
        title,
        content: newContent,
        lang,
      });

      if (saved) {
        appStore?.setSelectedSnippetId(saved.id);
      }
      toastMsg = 'Add Success';
    } else if (mode === 'edit') {
      if (!selectedSnippetId) {
        return false;
      }
      snippetsStore?.update({
        id: selectedSnippetId,
        title,
        content: newContent,
        lang,
      });
      toastMsg = 'The modification was successful';
    }
    toast.success(toastMsg, {
      position: toast.POSITION.BOTTOM_CENTER,
      autoClose: 2000,
      hideProgressBar: true,
    });
    return true;
  }, [mode, title, lang, selectedSnippetId, appStore, snippetsStore]);

  const handleSaveAndQuit = async () => {
    const isOk = await handleSave();
    if (isOk) {
      appStore?.setMode('view');
    }
  };

  useEffect(() => {
    if (editorRef && editorRef.current) {
      // 2048 -> cmdctrl, 49 -> s
      // eslint-disable-next-line no-bitwise
      editorRef.current.addCommand(2048 | 49, handleSave);
    }
  }, [handleSave]);

  useEffect(() => {
    (async () => {
      if (mode === 'new') {
        const defaultLang = await window.electron.preferences.get(
          'editor.defaultLang'
        );
        if (defaultLang) {
          setLang(defaultLang as string);
        }
      }
    })();
  }, [mode]);

  const handleEditorDidMount = (
    editor: Monaco.editor.IStandaloneCodeEditor
  ) => {
    editorRef.current = editor;
  };

  const handleCancel = () => {
    if (appStore?.mode === 'edit') {
      appStore?.setMode('view');
    } else if (appStore?.mode === 'new') {
      appStore?.setMode(null);
    }
  };

  return (
    <>
      <TopBar snippet={selectedSnippet} />
      <input
        className="title"
        type="text"
        maxLength={40}
        placeholder="Untitled"
        value={title}
        onChange={(e) => handleEditingTitle(e.target.value)}
      />
      <span className="datetime">
        {mode === 'new'
          ? dayjs().format('HH:mm')
          : dayjs(datetime).format('YYYY-MM-DD HH:mm:ss')}
      </span>
      <div className="data">
        <MonacoEditor
          onMount={handleEditorDidMount}
          theme={editorTheme}
          language={lang}
          value={content}
        />
      </div>
      <div className="bottom-toolbox">
        <div className="buttons">
          <button type="button" className="save" onClick={handleSaveAndQuit}>
            Save
          </button>
          <button type="button" className="cancel" onClick={handleCancel}>
            Cancel
          </button>
        </div>
        <select
          className="lang"
          name="lang"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
        >
          {languages.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
};

export default observer(Editor);
