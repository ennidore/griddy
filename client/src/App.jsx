import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAuth } from './context/AuthContext.jsx';
import AuthScreen from './components/auth/AuthScreen.jsx';
import MenuScreen from './screens/MenuScreen.jsx';
import GameScreen from './screens/GameScreen.jsx';
import CustomizeScreen from './screens/CustomizeScreen.jsx';
import FriendsScreen from './screens/FriendsScreen.jsx';
import LeaderboardScreen from './screens/LeaderboardScreen.jsx';
import ProfileSheet from './components/profile/ProfileSheet.jsx';
import RewardToast from './components/RewardToast.jsx';

const SCREENS = {
  menu: MenuScreen,
  game: GameScreen,
  customize: CustomizeScreen,
  friends: FriendsScreen,
  leaderboard: LeaderboardScreen,
};

export default function App() {
  const { identity, loading } = useAuth();
  const [screen, setScreen] = useState('menu');
  const [profileOpen, setProfileOpen] = useState(false);

  if (loading) {
    return (
      <div className="grid h-full place-items-center">
        <Loader2 className="size-8 animate-spin text-grape" />
      </div>
    );
  }
  if (!identity) return <AuthScreen />;

  const Screen = SCREENS[screen];
  const go = (next) => {
    setScreen(next);
    window.scrollTo(0, 0);
  };
  const nav = {
    go,
    back: () => go('menu'),
    openProfile: () => setProfileOpen(true),
  };

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          className="h-full"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          <Screen nav={nav} />
        </motion.div>
      </AnimatePresence>
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
      <RewardToast />
    </>
  );
}
