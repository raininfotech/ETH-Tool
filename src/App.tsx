import { providers } from "ethers";
import React, { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Address from "./Address";
import Footer from "./commonComponents/Footer";
import Header from "./commonComponents/Header";
import Decoder from "./Decoder";
import DecodeRaw from "./DecodeRaw";
import Home from "./home";
import SignAndVerify from "./SignAndVerify";
import Tools from "./Tools";
import Transaction from "./Transaction";
import UnitConvert from "./UnitConvert";
import Utilities from "./Utilities";

function App() {
    const [rpcProviderUrl] = useState<string>(() => {
        return localStorage.getItem("rpcProviderUrl") || "";
    });
    const [networkOption, setNetworkOption] = useState(() => {
        return localStorage.getItem("networkOption") || "mainnet";
    });
    const [networkName, setNetworkName] = useState("");
    const [networkId, setNetworkId] = useState("");
    const [rpcProvider, setRpcProvider] = useState<providers.Provider>(() => {
        try {
            const net = localStorage.getItem("networkOption") || "mainnet";
            const url = localStorage.getItem("rpcProviderUrl");
            if (url) {
                return new providers.StaticJsonRpcProvider(url.replace("{network}", net));
            }

            if (net === "injected" && (window as any).ethereum) {
                return new providers.Web3Provider((window as any).ethereum, "any");
            }

            return providers?.getDefaultProvider(net);
        } catch (err) {
            console.error(err);
        }

        return providers?.getDefaultProvider("mainnet");
    });
    const handleNetworkOptionChange = (e: any) => {
        let value = e.value;
        setNetworkOption(value);
        localStorage.setItem("networkOption", value);
        if (rpcProviderUrl) {
            let url = rpcProviderUrl.replace("{network}", value);
            const provider = new providers.JsonRpcProvider(url);
            setRpcProvider(provider);
        } else if (value === "injected") {
            const provider = new providers.Web3Provider((window as any).ethereum, "any");
            setRpcProvider(provider);
        } else {
            setRpcProvider(providers?.getDefaultProvider(value));
        }
    };
    useEffect(() => {
        (window as any).provider = rpcProvider;
        setNetworkName("");
        setNetworkId("");
        rpcProvider
            .getNetwork()
            .then((network: any) => {
                setNetworkName(network?.name);
                setNetworkId(network?.chainId);
            })
            .catch(() => {});
    }, [rpcProvider]);

    return (
        <main>
            <BrowserRouter>
                <Header networkOption={networkOption} handleNetworkOptionChange={handleNetworkOptionChange} />
                <Routes>
                    <Route path="/" element={<Home networkName={networkName} networkId={networkId} />} />
                    <Route path="/decoder" element={<Decoder />} />
                    <Route path="/decode" element={<DecodeRaw />} />
                    <Route path="/tools" element={<Tools />} />
                    <Route path="/transaction" element={<Transaction />} />
                    <Route path="/unit-convert" element={<UnitConvert />} />
                    <Route path="/sign-verify" element={<SignAndVerify />} />
                    <Route path="/address" element={<Address />} />
                    <Route path="/decode-raw-tx" element={<DecodeRaw />} />
                    <Route path="/utilities" element={<Utilities />} />
                </Routes>
                <Footer />
            </BrowserRouter>
        </main>
    );
}

export default App;
