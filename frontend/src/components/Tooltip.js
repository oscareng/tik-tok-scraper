import { useRef, useEffect } from "react";
import clsx from "clsx";


const ToolTip = ({ children, tooltip, show }) => {
  const tooltipRef = useRef(null);
  const container = useRef(null);

//always keep tooltip inside visible screen 
    useEffect(() => {
        if (tooltipRef.current) {
            const { left, top, width, height } = tooltipRef.current.getBoundingClientRect();
            const { innerWidth, innerHeight } = window;
            const { scrollX, scrollY } = window;
            const { offsetWidth, offsetHeight } = container.current;

            if (left + width > innerWidth + scrollX) {
                tooltipRef.current.style.left = `-${width+75}px`;
            }
            
            if (left < scrollX) {
                tooltipRef.current.style.left = `${offsetWidth+75}px`;
            }
           
        }
    }, [show]);






    
  return (
    <div
      ref={container}
     
      className="group relative inline-block z-10 "
    >
      {children}
      {tooltip ? (
        <span
          ref={tooltipRef}
          className={clsx("  opacity-0  transition bg-black text-white p-1 rounded absolute top-full mt-2 font-xs whitespace-wrap", show && 'visible opacity-100')}
            style={{fontSize:'13px', backgroundColor:'rgba(0, 0, 0, .8)', width:'216px', transform: 'translateX(-50%)',}}
        
        > 
          {tooltip}
        </span>
      ) : null}
    </div>
  );
};

export default ToolTip;