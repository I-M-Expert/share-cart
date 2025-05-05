import { BrowserRouter } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { NavMenu } from "@shopify/app-bridge-react";
import Routes from "./Routes";
import { QueryProvider, PolarisProvider } from "./components";
import { Provider } from "react-redux";
import store, { persistor } from "./store/store";
import { PersistGate } from "redux-persist/integration/react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useState, useEffect } from "react";
// Import mainMenu array from Sidebar
import { mainMenu } from "./components/Sidebar";

export default function App() {
  const pages = import.meta.glob("./pages/**/!(*.test.[jt]sx)*.([jt]sx)", {
    eager: true,
  });
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

   
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <PolarisProvider>
          <BrowserRouter>
            <QueryProvider>
              <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                pauseOnFocusLoss
                draggable
                pauseOnHover
              />
              <NavMenu>
                {isMobile
                  ? mainMenu.map((item) => (
                      <a href={item.link} rel={item.title}>
                        {item.title}
                      </a>
                    ))
                  : []}
              </NavMenu>
              <Routes pages={pages} />
            </QueryProvider>
          </BrowserRouter>
        </PolarisProvider>
      </PersistGate>
    </Provider>
  );
}
