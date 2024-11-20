import useEventListener from '@use-it/event-listener';
import { observer } from 'mobx-react';
import dayjs from 'dayjs';
import { AiOutlineCloseCircle } from 'react-icons/ai';
import { useHistory } from 'react-router-dom';
import { useRef, useEffect, useState } from 'react';
import { version } from '../../../release/app/package.json';
import { useStore } from '../contextProvider/storeContext';
import languages from './Content/languages';
import Modal from '../components/Modal';
import { EditorPref, WebDavPref } from '../../main/preferences';
import { Theme } from '../stores/app';
import { notifySuccess, notifyWarning } from '../utils/notify';
import webdav from '../utils/webdav';
import { APP_DOWNLOAD_URL } from '../../constants';

import './Setting.scss';

interface NewVersion {
  version: string;
  releaseDate: string;
}

interface WebDavConfig {
  username: string;
  password: string;
  url: string;
}

const defaultWebDavConfig: WebDavConfig = {
  username: '',
  password: '',
  url: '',
};

const Setting = () => {
  const store = useStore();
  const [shortcut, setShortcut] = useState('');
  const [defaultLang, setDefaultLang] = useState('text');
  const [newVersion, setNewVersion] = useState<NewVersion | null>(null);
  const [editorDefaultMode, setEditorDefaultMode] = useState<
    'readonly' | 'editable'
  >('readonly');
  const [webDavDialog, setWebDavDialog] = useState(false);
  const [webDavConfig, setWebDavConfig] = useState<WebDavConfig | null>(null);
  const [webDavLoading, setWebDavLoading] = useState(false);
  const quickWindowShortcutRef = useRef<HTMLInputElement>(null);
  const history = useHistory();

  useEventListener(
    'keyup',
    (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        window.electron.preferences.set('shortcuts.quickWindow', '');
        window.electron.setting.shortcuts.quickWindow(shortcut, '');
        setShortcut('');
      } else if (
        (e.shiftKey || e.ctrlKey || e.altKey) &&
        !['Control', 'Shift', 'Alt'].includes(e.key)
      ) {
        const keys = [];
        if (e.ctrlKey) {
          keys.push('Ctrl');
        }
        if (e.shiftKey) {
          keys.push('Shift');
        }
        if (e.altKey) {
          keys.push('Alt');
        }
        if (e.key) {
          keys.push(e.key);
        }
        const newAccelerator = keys.join(' + ');
        window.electron.setting.shortcuts.quickWindow(shortcut, newAccelerator);
        setShortcut(newAccelerator);
        window.electron.preferences.set(
          'shortcuts.quickWindow',
          newAccelerator
        );
      }
    },
    quickWindowShortcutRef.current
  );

  useEffect(() => {
    (async () => {
      const editorPref = (await window.electron.preferences.get(
        'editor'
      )) as EditorPref;
      if (editorPref) {
        setDefaultLang(editorPref.defaultLang);
        setEditorDefaultMode(editorPref.defaultMode);
      }
    })();
  }, []);

  useEffect(() => {
    window.electron.preferences
      .get<WebDavPref>('webdav')
      .then((config) => {
        setWebDavConfig(config);
        return true;
      })
      .catch(() => {});
  }, []);

  const openExternal = (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('external')) {
      e.preventDefault();
      window.electron.shell.openExternal((target as HTMLAnchorElement).href);
    }
  };

  useEventListener('click', (e: Event) => {
    openExternal(e);
  });

  useEffect(() => {
    (async () => {
      const quickWindowShortcut = await window.electron.preferences.get(
        'shortcuts.quickWindow'
      );
      if (quickWindowShortcut) {
        setShortcut(quickWindowShortcut as string);
      }
    })();
  }, []);

  const handleExport = () => {
    window.electron.file.save(
      'Save Data',
      'tinycodes.json',
      'Export',
      JSON.stringify(store?.snippetsStore.snippets || {})
    );
  };

  const handleOpenConfigWebDav = async () => {
    const config = await window.electron.preferences.get<WebDavConfig>(
      'webdav'
    );
    setWebDavConfig(config);
    setWebDavDialog(true);
  };

  const handleConfigWebDav = async () => {
    if (webDavConfig === null) return;

    const authed = await webdav.auth(webDavConfig);
    if (authed) {
      setWebDavDialog(false);
    }
  };

  const handleSyncWebDav = async () => {
    setWebDavLoading(true);
    if ((await webdav.validate()) === false) {
      setWebDavLoading(false);
      return;
    }
    await webdav.sync();
    notifySuccess('sucess');
    await store?.snippetsStore.sync();
    setWebDavLoading(false);
  };

  const handleUpdatePartialWebDav = (config: Partial<WebDavConfig>) => {
    setWebDavConfig({ ...defaultWebDavConfig, ...webDavConfig, ...config });
  };

  const handleCheckUpdate = () => {
    window.electron.system.checkUpdate().catch(() => {
      notifyWarning('Sending failed，Check network');
    });
  };

  const handleSetDefaultLang = (val: string) => {
    window.electron.preferences.set('editor.defaultLang', val);
    setDefaultLang(val);
  };

  const handleSetTheme = (val: string) => {
    store?.appStore.setTheme(val as Theme);
  };

  const handleSetEditorDefaultMode = (val: string) => {
    window.electron.preferences.set('editor.defaultMode', val);
    setEditorDefaultMode(val as 'readonly' | 'editable');
  };

  const handleOpenSite = () => {
    setNewVersion(null);
    window.electron.shell.openExternal(APP_DOWNLOAD_URL);
  };

  const handleGoBack = () => {
    history.goBack();
  };

  return (
    <div className="setting">
      <div className="setting-title">
        <h2>Preferences</h2>
        <AiOutlineCloseCircle
          className="close-btn"
          size={22}
          onClick={handleGoBack}
        />
      </div>
      <section>
        <p className="title">Appearance</p>
        <div className="setting-item">
          <span>Topics</span>
          <select
            value={store?.appStore.theme}
            onChange={(e) => handleSetTheme(e.target.value)}
          >
            <option value="system">system</option>
            <option value="light">light</option>
            <option value="dark">dark</option>
          </select>
        </div>
      </section>
      <section>
        <p className="title">Shortcuts</p>
        <div className="setting-item">
          <span>Show shortcut window</span>
          <input
            className="shortcut-input"
            type="text"
            placeholder="Setting shortcuts"
            ref={quickWindowShortcutRef}
            value={shortcut}
            onChange={() => {}}
          />
        </div>
      </section>
      <section>
        <p className="title">Editor</p>
        <div className="setting-item">
          <span>Default Language</span>
          <select
            value={defaultLang}
            onChange={(e) => handleSetDefaultLang(e.target.value)}
          >
            {languages.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
        </div>
        <div className="setting-item">
          <span>Default Mode</span>
          <select
            value={editorDefaultMode}
            onChange={(e) => handleSetEditorDefaultMode(e.target.value)}
          >
            <option value="readonly">Read-only</option>
            <option value="editable">Editable</option>
          </select>
        </div>
      </section>
      <section>
        <p className="title">Data</p>
        <div className="setting-item">
          <span>Data files</span>
          <button type="button" onClick={handleExport}>
            exporting
          </button>
        </div>
        <div className="setting-item">
          <span>WebDav</span>
          <div>
            <button
              className="sync-btn"
              type="button"
              onClick={handleSyncWebDav}
              disabled={webDavLoading}
            >
              同步
            </button>
            <button type="button" onClick={handleOpenConfigWebDav}>
              Settings
            </button>
          </div>
        </div>
      </section>
      <section>
        <p className="title">Version</p>
        <div className="setting-item">
          <span>v{version}</span>
          <button type="button" onClick={handleCheckUpdate}>
            Check for updates
          </button>
        </div>
      </section>
      <section>
        <p className="title">about</p>
        <div className="setting-item">
          <span>Source Code</span>
          <a className="external" href="https://github.com/y-not-u/tinycodes">
            github.com/y-not-u/tinycodes
          </a>
        </div>
      </section>
      <Modal
        isOpen={Boolean(newVersion)}
        onClose={() => setNewVersion(null)}
        okLabel="Go to Download"
        onConfirm={handleOpenSite}
        width="50%"
      >
        <h2>new version</h2>
        {newVersion?.releaseDate ? (
          <small>{dayjs(newVersion.releaseDate).format('YYYY-MM-DD')}</small>
        ) : null}
        <br />
        <br />
        <p>{newVersion?.version} New version found</p>
      </Modal>
      <Modal
        isOpen={webDavDialog}
        onClose={() => setWebDavDialog(false)}
        onConfirm={handleConfigWebDav}
        width="50%"
        className="webdav-dialog"
      >
        <div>
          Username:
          <input
            type="text"
            value={webDavConfig?.username}
            onChange={(e) =>
              handleUpdatePartialWebDav({ username: e.target.value })
            }
          />
        </div>
        <div>
          Password:
          <input
            value={webDavConfig?.password}
            type="password"
            onChange={(e) =>
              handleUpdatePartialWebDav({ password: e.target.value })
            }
          />
        </div>
        <div>
          URL:
          <input
            value={webDavConfig?.url}
            type="text"
            onChange={(e) => handleUpdatePartialWebDav({ url: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
};

export default observer(Setting);
