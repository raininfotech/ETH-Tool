import { providers, Wallet } from "ethers";
import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { useLocation } from "react-router-dom";
import { BASE_URL } from "./Config";
import { DecryptMessage, EncryptMessage, Fieldset, HashMessage, SignMessage, VerifySignature } from "./home";

function SignAndVerify() {
    let location = useLocation();
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
                <title>Ethereum sign and verify developer tools</title>
                <meta
                    name="description"
                    content="Ethereum sign and verify developer tools help developers easily create and verify signatures that can be used to authenticate messages and transactions."
                />
                <meta property="og:title" content="Ethereum sign and verify developer tools" />
                <meta
                    property="og:description"
                    content="Ethereum sign and verify developer tools help developers easily create and verify signatures that can be used to authenticate messages and transactions."
                />
                <meta property="og:url" content={`${BASE_URL}${location.pathname}`} />
                <link rel="canonical" href={`${BASE_URL}${location.pathname}`} />
            </Helmet>
            <div className="row">
                <div className="col-6">
                    <Fieldset legend="Encrypt Message" height="400px">
                        <section>
                            <EncryptMessage />
                        </section>
                    </Fieldset>
                </div>
                <div className="col-6">
                    <Fieldset legend="Decrypt Message" height="400px">
                        <section>
                            <DecryptMessage />
                        </section>
                    </Fieldset>
                </div>
                <div className="col-6">
                    <Fieldset legend="Hash Message" height="400px">
                        <section>
                            <HashMessage />
                        </section>
                    </Fieldset>
                </div>
                <div className="col-6">
                    <Fieldset legend="Sign Message" height="400px">
                        <section>
                            <SignMessage wallet={wallet} />
                        </section>
                    </Fieldset>
                </div>
                <div className="col-6">
                    <Fieldset legend="Verify signature" height="400px">
                        <section>
                            <VerifySignature />
                        </section>
                    </Fieldset>
                </div>
            </div>
        </>
    );
}

export default SignAndVerify;
