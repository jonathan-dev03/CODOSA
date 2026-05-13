import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/home');
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="h-screen w-screen bg-primary flex items-center justify-center overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="flex flex-col items-center relative"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-secondary opacity-5 rounded-full blur-[100px]"></div>
        
        <div className="w-48 h-48 bg-white rounded-[2.5rem] flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden border-4 border-white/20">
           <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-100 opacity-50"></div>
           <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center font-black text-4xl text-white border-4 border-accent shadow-xl relative z-10">
             C
           </div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-8 text-center"
        >
          <h1 className="text-white text-4xl font-black tracking-tighter italic uppercase">CODOSA</h1>
          <p className="text-accent mt-2 font-black text-[10px] uppercase tracking-[0.4em] opacity-80">KOLÈJ DOMINIK SAVYO</p>
        </motion.div>

        <div className="absolute bottom-[-100px] flex items-center space-x-2">
           <div className="loader border-t-accent w-4 h-4"></div>
           <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">Chaje done...</span>
        </div>
      </motion.div>
    </div>
  );
}
