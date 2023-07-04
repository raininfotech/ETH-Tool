import { providers, Wallet } from "ethers";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ClearLocalStorage, Select } from "../home";
import ReactSelect from "react-select";
import { NETWORK_OPTIONS, TAB_LIST } from "./Constants";

function Header(props: any) {
    const { handleNetworkOptionChange, networkOption } = props;
    const navigate = useNavigate();
    const location = useLocation();
    const [tab, setTab] = useState("");
    const tabOptions =
        TAB_LIST &&
        TAB_LIST.map((item) => {
            return {
                nav: item.nav,
                value: item.id,
                label: item.name,
            };
        });
    // const networkOptions = ["injected", "mainnet", "goerli"];

    const networkOptions =
        NETWORK_OPTIONS &&
        NETWORK_OPTIONS.map((item) => {
            return {
                value: item.value,
                label: item.name,
            };
        });
    const [useWeb3] = useState<boolean>(() => {
        const cached = localStorage.getItem("useWeb3");
        if (cached) {
            return cached === "true";
        }
        return true;
    });
    const [privateKey] = useState(() => {
        return localStorage.getItem("privateKey") || "";
    });

    const [rpcProvider] = useState<providers.Provider>(() => {
        try {
            const net = localStorage.getItem("networkOption") || "mainnet";
            const url = localStorage.getItem("rpcProviderUrl");
            if (url) {
                return new providers.StaticJsonRpcProvider(url.replace("{network}", net));
            }

            if (net === "injected" && (window as any).ethereum) {
                return new providers.Web3Provider((window as any).ethereum, "any");
            }

            return providers.getDefaultProvider(net);
        } catch (err) {
            console.error(err);
        }

        return providers.getDefaultProvider("mainnet");
    });
    const [wallet, setWallet] = useState<any>(rpcProvider);
    const [walletAddress, setWalletAddress] = useState<string>("");

    const [connectedChainId, setConnectedChainId] = useState<string | undefined>();
    const [connectedAccounts, setConnectedAccounts] = useState<string[] | undefined>();

    useEffect(() => {
        if ((window as any).ethereum) {
            (window as any).ethereum.on("chainChanged", (chainId: string) => {
                setConnectedChainId(chainId);
            });
            (window as any).ethereum.on("accountsChanged", (accounts: string[]) => {
                setConnectedAccounts(accounts);
            });
        }
    }, []);

    useEffect(() => {
        (window as any).wallet = wallet;

        const updateWalletAddress = async () => {
            setWalletAddress("");
            try {
                let signer: Signer = wallet;
                if (wallet.getSigner) {
                    signer = await wallet.getSigner();
                }
                if (signer?.getAddress) {
                    const address = await signer.getAddress();
                    setWalletAddress(address);
                }
            } catch (err) {
                console.error(err);
            }
        };
        updateWalletAddress();
    }, [wallet]);

    useEffect(() => {
        try {
            if (useWeb3) {
                if ((window as any).ethereum) {
                    const provider = new providers.Web3Provider((window as any).ethereum, "any");
                    const signer = provider.getSigner();
                    setWallet(signer);
                } else {
                    alert("window.web3 not found");
                }
            } else {
                if (privateKey) {
                    const priv = privateKey.replace(/^(0x)?/, "0x");
                    const wal = new Wallet(priv, rpcProvider);
                    setWallet(wal);
                } else {
                    setWallet(null);
                }
            }
        } catch (err) {
            console.error(err);
        }
    }, [useWeb3, privateKey, rpcProvider, connectedChainId, connectedAccounts]);

    const handleConnect = async (event: any) => {
        event.preventDefault();
        try {
            const windowWeb3 = (window as any).ethereum;
            if (windowWeb3 && windowWeb3.enable) {
                await windowWeb3.enable();
            }
        } catch (err) {
            alert(err.message);
        }
    };

    // const handleNetworkOptionChange = (value: string) => {
    //     setNetworkOption(value);
    //     localStorage.setItem("networkOption", value);
    //     if (rpcProviderUrl) {
    //         let url = rpcProviderUrl.replace("{network}", value);
    //         const provider = new providers.JsonRpcProvider(url);
    //         setRpcProvider(provider);
    //     } else if (value === "injected") {
    //         const provider = new providers.Web3Provider((window as any).ethereum, "any");
    //         setRpcProvider(provider);
    //     } else {
    //         setRpcProvider(providers.getDefaultProvider(value));
    //     }
    // };
    useEffect(() => {
        if (tab) {
            navigate(tab);
        }
    }, [tab]);

    return (
        <>
            <header className="header-style mb-3 d-flex">
                <button
                    className={`${location.pathname == "/" ? "btn btn-primary" : ""}`}
                    onClick={() => {
                        navigate("/");
                    }}
                >
                    <h6 className="mt-1">Contract UI</h6>
                </button>
                <button
                    className={`${location.pathname == "/decoder" ? "btn btn-primary" : ""}`}
                    onClick={() => {
                        navigate("/decoder");
                    }}
                >
                    <h6 className="mt-1">Decoder</h6>
                </button>
                <button
                    className={`${location.pathname == "/decode-raw-tx" ? "btn btn-primary" : ""}`}
                    onClick={() => {
                        navigate("/decode-raw-tx");
                    }}
                >
                    <h6 className="mt-1">Decode RawTx</h6>
                </button>
                <button
                    className={`${location.pathname == "/tools" ? "btn btn-primary" : ""}`}
                    onClick={() => {
                        navigate("/tools");
                    }}
                >
                    <h6 className="mt-1">Tools</h6>
                </button>
                <button
                    className={`${location.pathname == "/transaction" ? "btn btn-primary" : ""}`}
                    onClick={() => {
                        navigate("/transaction");
                    }}
                >
                    <h6 className="mt-1">Transaction</h6>
                </button>
                <button
                    className={`${location.pathname == "/unit-convert" ? "btn btn-primary" : ""}`}
                    onClick={() => {
                        navigate("/unit-convert");
                    }}
                >
                    <h6 className="mt-1">Unit Converter</h6>
                </button>
                <button
                    className={`${location.pathname == "/sign-verify" ? "btn btn-primary" : ""}`}
                    onClick={() => {
                        navigate("/sign-verify");
                    }}
                >
                    <h6 className="mt-1">Sign and Verify</h6>
                </button>
                <button
                    className={`${location.pathname == "/address" ? "btn btn-primary" : ""}`}
                    onClick={() => {
                        navigate("/address");
                    }}
                >
                    <h6 className="mt-1">Address</h6>
                </button>
                <button
                    className={`${location.pathname == "/utilities" ? "btn btn-primary" : ""}`}
                    onClick={() => {
                        navigate("/utilities");
                    }}
                >
                    <h6 className="mt-1">Utilities</h6>
                </button>
            </header>
            <div className="row">
                <div className="col-xl-6 col-lg-12 col-md-12 col-sm-12">
                    <div className="row">
                        <div className="col-6">
                            <ul className="mt-2 mx-2">
                                <li>
                                    <h5>What are you looking for?</h5>
                                </li>
                            </ul>
                        </div>
                        <div className="col-4">
                            <ReactSelect name="tabList" options={tabOptions} onChange={(e: { nav: string }) => setTab(e.nav)} placeholder="Search tab name" />
                        </div>
                    </div>
                </div>
                <div className="col-xl-5 col-lg-12 offset-xl-1 col-md-12 col-sm-12 ">
                    <div className="row d-lg-flex justify-content-end">
                        <div className="col-3 offset-lg-2 p-0">
                            <ReactSelect name="networkList" options={networkOptions} onChange={handleNetworkOptionChange} placeholder="Search Network" />
                        </div>
                        <div className="col-3 d-lg-flex justify-content-end" style={{ padding: "0rem 1.2rem 0rem 1rem" }}>
                            <button className="py-2 w-200 mb-3 w-200" onClick={handleConnect} disabled={!useWeb3 || !!walletAddress}>
                                {!useWeb3 || !!walletAddress ? "Connected" : "Connect Wallet"}
                            </button>
                        </div>
                        <div className="col-3 d-lg-flex justify-content-end px-1">
                            <ClearLocalStorage />
                        </div>
                    </div>
                    {/* <Select onChange={handleNetworkOptionChange} selected={networkOption} options={networkOptions} /> */}
                </div>
            </div>
        </>
    );
}

export default Header;
//    <div className="col-6 ">
//        <div className="row">
//            <div className="col-6 d-flex justify-content-end">
//                <ReactSelect name="networkList" options={networkOptions} onChange={handleNetworkOptionChange} placeholder="Search Network" />
//            </div>
//            <div className="col-3 d-flex justify-content-end">
//                <button className="py-2 w-200 mb-3 w-200" onClick={handleConnect} disabled={!useWeb3 || !!walletAddress}>
//                    {!useWeb3 || !!walletAddress ? "Connected" : "Connect Wallet"}
//                </button>
//            </div>
//            <div className="col-3 d-flex justify-content-end">
//                <ClearLocalStorage />
//            </div>
//        </div>
//        {/* <Select onChange={handleNetworkOptionChange} selected={networkOption} options={networkOptions} /> */}
//    </div>;
