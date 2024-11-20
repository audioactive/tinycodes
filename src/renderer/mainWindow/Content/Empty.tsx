import { observer } from 'mobx-react';
import { useEffect, useState } from 'react';
import { useStore } from '../../contextProvider/storeContext';
import CodeIcon from '../../../../assets/images/code.png';
import './Content.scss';

const Empty = () => {
  const store = useStore();
  const [other, setOther] = useState('');

  useEffect(() => {
    const tips = [
      'Ctrl + Shift + V Can exhale shortcut window',
      'Talk is cheap. Show me the code.',
    ];
    const changeTip = () => {
      setOther(tips[Math.floor(Math.random() * tips.length)]);
    };

    const timer = setInterval(changeTip, 4000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="empty">
      <div className="tip">
        <img src={CodeIcon} alt="" />
        <p>All fragments</p>
        <small>A total of{store?.snippetsStore.snippets.length}Article</small>
        <p className="other">{other}</p>
      </div>
    </div>
  );
};

export default observer(Empty);
