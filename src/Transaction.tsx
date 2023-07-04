import { providers, Wallet } from "ethers";
import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { useLocation } from "react-router-dom";
import { BASE_URL } from "./Config";
import { CustomTx, Fieldset, GetFeeData, GetGasPrice, GetNonce, GetTx, SendEth, SendRawTx, TxReceipt } from "./home";

function Transaction() {
    let location = useLocation();
    const [networkName, setNetworkName] = useState("");
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
        (window as any).provider = rpcProvider;
        setNetworkName("");
        rpcProvider
            .getNetwork()
            .then((network: any) => {
                setNetworkName(network?.name);
            })
            .catch(() => {});
    }, [rpcProvider, connectedChainId]);
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

    return (
        <>
            <Helmet>
                <title>Raw transaction tool</title>
                <meta name="description" content="Raw transaction tools are basically used to Send ETH, Get nonce, Custom transaction, and send raw transaction that meets specific needs." />
                <meta property="og:title" content="Raw transaction tool" />
                <meta property="og:description" content="Raw transaction tools are basically used to Send ETH, Get nonce, Custom transaction, and send raw transaction that meets specific needs." />
                <meta property="og:url" content={`${BASE_URL}${location.pathname}`} />
                <link rel="canonical" href={`${BASE_URL}${location.pathname}`} />
            </Helmet>
            <div className="row">
                <div className="col-6">
                    <Fieldset legend="Send ETH" height="400px">
                        <section>
                            <SendEth wallet={wallet} />
                        </section>
                    </Fieldset>
                </div>
                <div className="col-6">
                    <Fieldset legend="Get nonce" height="400px">
                        <section>
                            <GetNonce provider={rpcProvider} />
                        </section>
                    </Fieldset>
                </div>
                <div className="col-6">
                    <Fieldset legend="Custom transaction" height="400px">
                        <section>
                            <CustomTx wallet={wallet} network={networkName} />
                        </section>
                    </Fieldset>
                </div>
                <div className="col-6">
                    <Fieldset legend="Send raw transaction" height="400px">
                        <section>
                            <SendRawTx provider={rpcProvider} />
                        </section>
                    </Fieldset>
                </div>
                <div className="col-6">
                    <Fieldset legend="Get Gas Price" height="400px">
                        <section>
                            <GetGasPrice provider={rpcProvider} />
                        </section>
                    </Fieldset>
                </div>
                <div className="col-6">
                    <Fieldset legend="Get Gas Fee Data" height="400px">
                        <section>
                            <GetFeeData provider={rpcProvider} />
                        </section>
                    </Fieldset>
                </div>
                <div className="col-6">
                    <Fieldset legend="Get Transaction" height="400px">
                        <section>
                            <GetTx provider={rpcProvider} />
                        </section>
                    </Fieldset>
                </div>
                <div className="col-6">
                    <Fieldset legend="Get Transaction Receipt" height="400px">
                        <section>
                            <TxReceipt provider={rpcProvider} />
                        </section>
                    </Fieldset>
                </div>
            </div>
        </>
    );
}

export default Transaction;
