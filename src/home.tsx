import React, { useMemo, useEffect, useState, SyntheticEvent, useCallback } from "react";
import { ethers, BigNumber, Contract, Wallet, Signer, providers, utils } from "ethers";
// @ts-ignore
import nativeAbis from "./abi";
import CID from "cids";
import { Modal } from "react-bootstrap";
import { truncateString } from "./common";
import { Helmet } from "react-helmet";
import { useLocation } from "react-router-dom";
import { BASE_URL } from "./Config";

const { DateTime } = require("luxon");
const fourByte = require("4byte");
const Buffer = require("buffer/").Buffer;
const sigUtil = require("eth-sig-util");
const etherConverter = require("ether-converter"); // TODO: types
const privateKeyToAddress = require("ethereum-private-key-to-address");
const privateKeyToPublicKey = require("ethereum-private-key-to-public-key");
const publicKeyToAddress = require("ethereum-public-key-to-address");
const base58 = require("bs58"); // TODO: types
const contentHash = require("content-hash"); // TODO: types
//const namehash = require('eth-ens-namehash') // namehash.hash(...)
const contentHash2 = require("@ensdomains/content-hash");

// utils available as globals
(window as any).BigNumber = BigNumber;
(window as any).ethers = ethers;
(window as any).utils = utils;
(window as any).CID = CID;
(window as any).contentHash = contentHash;
(window as any).base58 = base58;
(window as any).contentHash2 = contentHash2;
(window as any).DateTime = DateTime;

function intToHex(value: number) {
    try {
        return BigNumber.from((value || 0).toString()).toHexString();
    } catch (err) {
        return "0x";
    }
}

function getTxExplorerUrl(txHash: string, network: string) {
    let baseUrl = "";
    if (["mainnet", "kovan", "goerli", "rinkeby", "ropsten"].includes(network)) {
        const subdomain = network === "mainnet" ? "" : `${network}.`;
        baseUrl = `https://${subdomain}etherscan.io`;
    } else if (network === "optimism") {
        baseUrl = "https://optimistic.etherscan.io";
    } else if (network === "arbitrum") {
        baseUrl = "https://arbiscan.io";
    } else if (network === "polygon") {
        baseUrl = "https://https://polygonscan.com";
    } else if (network === "xdai") {
        baseUrl = "https://blockscout.com/xdai/mainnet";
    } else if (network === "avalance") {
        baseUrl = "https://snowtrace.io";
    } else if (network === "binance") {
        baseUrl = "https://bscscan.com";
    }
    const path = `/tx/${txHash}`;
    return `${baseUrl}${path}`;
}

export function Fieldset(props: any) {
    const { legend, children, height } = props;
    return (
        <fieldset className="overflow-y-auto" style={{ height: `${height}` }}>
            <legend className="text-center mt-2">{legend}</legend>
            <hr className="m-0" />
            <div className="p-3">{children}</div>
        </fieldset>
    );
}

export function UnitConverter() {
    const [values, setValues] = useState<any>(() => {
        try {
            return JSON.parse(localStorage.getItem("converter") || "") || {};
        } catch (err) {
            return {};
        }
    });
    const units = ["wei", "kwei", "mwei", "gwei", "szabo", "finney", "ether", "kether", "mether", "gether", "tether"];
    useEffect(() => {
        try {
            localStorage.setItem("converter", JSON.stringify(values));
        } catch (err) {
            console.error(err);
        }
    }, [values]);

    return (
        <div>
            {units.map((unit, i) => {
                let val = values[unit] ?? "";
                let pow = -18 + i * 3;
                let exp = pow ? (
                    <>
                        10<sup>{pow}</sup>
                    </>
                ) : (
                    1
                );
                return (
                    <div key={unit}>
                        <label>
                            {unit} ({exp}) {unit === "gwei" && <small>(gas)</small>}
                        </label>
                        <div style={{ display: "flex" }}>
                            <div style={{ width: "100%" }}>
                                <input
                                    type="text"
                                    value={val}
                                    onChange={(event: any) => {
                                        try {
                                            const value = event.target.value;
                                            const result = etherConverter(value, unit);
                                            result[unit] = value;
                                            if (result["wei"] === "NaN") {
                                                setValues({});
                                            } else {
                                                setValues(result);
                                            }
                                        } catch (err) {
                                            console.error(err);
                                        }
                                    }}
                                />
                            </div>
                            <div style={{ width: "300px", marginLeft: "1rem" }}>{intToHex(val)}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export function CustomTx(props: any = {}) {
    const { wallet } = props;
    const cacheKey = "customTxMethodType";
    const [methodType, setMethodType] = useState<string>(() => {
        return localStorage.getItem(cacheKey) || "broadcast";
    });
    const [txhash, setTxhash] = useState<any>(null);
    const [result, setResult] = useState("");
    const [blockTag, setBlockTag] = useState<string>(() => {
        return localStorage.getItem("customTxBlockTag") || "";
    });
    const [tx, setTx] = useState<any>(() => {
        const defaultTx = JSON.stringify(
            {
                to: "",
                value: "",
                data: "",
                gasLimit: "",
                gasPrice: "",
                nonce: "",
            },
            null,
            2
        );
        try {
            return localStorage.getItem("customTx") || defaultTx;
        } catch (err) {
            return defaultTx;
        }
    });
    const handleChange = (event: any) => {
        const val = event.target.value;
        setTx(val);
        localStorage.setItem("customTx", val);
    };
    const updateMethodType = (event: any) => {
        const { value } = event.target;
        setMethodType(value);
        localStorage.setItem(cacheKey, value);
    };
    const send = async () => {
        try {
            setTxhash(null);
            setResult("");
            const txData = JSON.parse(tx);
            let res: any;
            if (methodType === "static") {
                let _blockTag = undefined;
                if (blockTag) {
                    if (!Number.isNaN(Number(blockTag))) {
                        _blockTag = Number(blockTag);
                    } else {
                        _blockTag = blockTag;
                    }
                }

                res = await wallet.call(txData, _blockTag);
            } else if (methodType === "populate") {
                res = await wallet.populateTransaction(txData);
            } else if (methodType === "estimate") {
                res = await wallet.estimateGas(txData);
            } else if (methodType === "sign") {
                res = await wallet.signTransaction(txData);
            } else {
                res = await wallet.sendTransaction(txData);
            }
            setTxhash(res?.hash);
            setResult(JSON.stringify(res, null, 2));
        } catch (err) {
            alert(err.message);
        }
    };

    const updateBlockTag = (val: string) => {
        setBlockTag(val);
        localStorage.setItem("customTxBlockTag", val);
    };

    const txLink = txhash ? getTxExplorerUrl(txhash, props.network) : null;

    return (
        <div>
            <div>
                <small>Use hex values</small>
            </div>
            <textarea value={tx} onChange={handleChange} />
            <label>block tag (for static calls)</label>
            <TextInput value={blockTag} placeholder={"latest"} onChange={updateBlockTag} />
            <div>
                <section className="mt-2">
                    <label>
                        <input type="radio" className="mx-2" value="broadcast" checked={methodType === "broadcast"} onChange={updateMethodType} />
                        sign & broadcast
                    </label>

                    <label>
                        <input type="radio" className="mx-2" value="static" checked={methodType === "static"} onChange={updateMethodType} />
                        call static
                    </label>

                    <label>
                        <input type="radio" className="mx-2" value="populate" checked={methodType === "populate"} onChange={updateMethodType} />
                        populate call
                    </label>

                    <label>
                        <input type="radio" className="mx-2" value="sign" checked={methodType === "sign"} onChange={updateMethodType} />
                        sign tx
                    </label>

                    <label>
                        <input type="radio" className="mx-2" value="estimate" checked={methodType === "estimate"} onChange={updateMethodType} />
                        estimate gas
                    </label>
                </section>
            </div>
            <div className="d-flex justify-content-center">
                <button className="w-200 my-1" onClick={send}>
                    submit
                </button>
            </div>
            <pre>{result}</pre>
            {txLink && (
                <a href={txLink} target="_blank" rel="noopener noreferrer">
                    {txLink}
                </a>
            )}
        </div>
    );
}

export function SendRawTx(props: any) {
    const { provider } = props;
    const [value, setValue] = useState(localStorage.getItem("sendRawTxValue") || "");
    const [result, setResult] = useState<any>(null);
    useEffect(() => {
        localStorage.setItem("sendRawTxValue", value || "");
    }, [value]);
    const handleValueChange = (value: string) => {
        setValue(value);
    };
    const sendTx = async () => {
        try {
            setResult(null);
            if (!value) {
                throw new Error("data is required");
            }
            const _tx = await provider.sendTransaction(value);
            setResult(_tx);
        } catch (err) {
            alert(err.message);
        }
    };
    const handleSubmit = (event: any) => {
        event.preventDefault();
        sendTx();
    };
    const output = JSON.stringify(result, null, 2);
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label>Signed raw transaction (hex)</label>
                <TextInput value={value} onChange={handleValueChange} placeholder="0x..." variant="textarea" />
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        send
                    </button>
                </div>
            </form>
            <div>
                <pre>{output}</pre>
            </div>
        </div>
    );
}

export function Select(props: any = {}) {
    const handleChange = (event: any) => {
        const value = event.target.value;
        if (props.onChange) {
            props.onChange(value);
        }
    };
    return (
        <select value={props.selected} onChange={handleChange} className="mx-2">
            {props.options.map((option: any, i: number) => {
                let label = option;
                let value = option;
                if (typeof option === "object") {
                    label = option.label;
                    value = option.value;
                }
                return (
                    <option key={i} value={value}>
                        {label}
                    </option>
                );
            })}
        </select>
    );
}

function TextInput(props: any = {}) {
    const [value, setValue] = useState("");
    const handleChange = (event: any) => {
        const val = event.target.value;
        setValue(val);
        if (props.onChange) {
            props.onChange(val);
        }
    };
    useEffect(() => {
        setValue(props.value);
    }, [props.value]);
    let el: any;
    if (props.variant === "textarea") {
        el = <textarea readOnly={props.readOnly} disabled={props.disabled} placeholder={props.placeholder} value={value || ""} onChange={handleChange} />;
    } else {
        el = <input readOnly={props.readOnly} disabled={props.disabled} placeholder={props.placeholder} type="text" value={value || ""} onChange={handleChange} />;
    }
    return el;
}

interface TransactionResult {
    hash: string;
    // Other properties of the transaction result object, if any
}

type AbiMethodFormProps = {
    abi: any;
    contractAddress: string;
    wallet: Wallet;
    network: string;
    txResult: TransactionResult | "";
    setTxResult: React.Dispatch<React.SetStateAction<TransactionResult | "">>;
};

function AbiMethodForm(props: AbiMethodFormProps) {
    const [checked, setChecked] = useState<Boolean>(false);
    const { abi: abiObj, contractAddress, wallet, network, txResult, setTxResult } = props;
    const cacheKey = JSON.stringify(abiObj);
    const [args, setArgs] = useState<any>(() => {
        const defaultArgs: any = {};
        try {
            return JSON.parse(localStorage.getItem(cacheKey) as any) || defaultArgs;
        } catch (err) {
            return defaultArgs;
        }
    });
    const [gasLimit, setGasLimit] = useState<string>(() => {
        return localStorage.getItem("gasLimit") || "";
    });
    const [gasPrice, setGasPrice] = useState<string>(() => {
        return localStorage.getItem("gasPrice") || "";
    });
    const [value, setValue] = useState<string>(() => {
        return localStorage.getItem("value") || "";
    });
    const [fromAddress, setFromAddress] = useState<string>("");
    const [nonce, setNonce] = useState<string>(() => {
        return localStorage.getItem("nonce") || "";
    });
    const [blockTag, setBlockTag] = useState<string>(() => {
        return localStorage.getItem("blockTag") || "";
    });
    const [methodSig, setMethodSig] = useState<string>("");
    const [error, setError] = useState<string>("");
    // const [txResult, setTxResult] = useState("");
    const [callStatic, setCallStatic] = useState<boolean>(() => {
        try {
            return localStorage.getItem("callStatic") === "true";
        } catch (err) {}
        return false;
    });
    const [txhash, setTxhash] = useState<any>(null);
    const [tx, setTx] = useState<any>(null);
    const windowWeb3 = (window as any).ethereum;
    const provider = useMemo(() => {
        if (windowWeb3) {
            return new providers.Web3Provider(windowWeb3, "any");
        }
    }, [windowWeb3]);
    useEffect(() => {
        const update = async () => {
            try {
                const address = await provider?.getSigner()?.getAddress();
                setFromAddress(address || "");
            } catch (err) {
                console.error(err);
            }
        };
        update();
    }, [provider, fromAddress, setFromAddress]);

    useEffect(() => {
        let tx: any = {
            from: fromAddress ? fromAddress : undefined,
            to: contractAddress ? contractAddress : undefined,
            value: value ? value : undefined,
            gasPrice: gasPrice ? utils.parseUnits(gasPrice, "gwei").toString() : undefined,
            gasLimit: gasLimit ? gasLimit : undefined,
            nonce: nonce ? nonce : undefined,
        };

        try {
            setError("");
            if (abiObj) {
                const iface = new utils.Interface([abiObj]);

                const parsed = args;
                for (const key in parsed) {
                    const value = parsed[key];
                    try {
                        const p = JSON.parse(value);
                        if (Array.isArray(p)) {
                            parsed[key] = p;
                        }
                    } catch (err) {}
                }

                const data = iface.encodeFunctionData(abiObj.name, Object.values(parsed).slice(0, abiObj?.inputs?.length ?? 0));
                tx.data = data;
            }
        } catch (err) {
            setError(err.message);
        }

        setTx(tx);
    }, [abiObj, contractAddress, gasPrice, gasLimit, value, fromAddress, nonce, args]);

    useEffect(() => {
        try {
            setMethodSig("");
            if (abiObj.signature) {
                setMethodSig(abiObj.signature);
            } else {
                const iface = new utils.Interface([abiObj]);
                const keys = Object.keys(iface.functions);
                if (keys.length) {
                    const _methodSig = `0x${(window as any).keccak256(keys[0]).toString("hex").slice(0, 8)}`;
                    setMethodSig(_methodSig);
                }
            }
        } catch (err) {}
    }, [abiObj]);

    if (abiObj.type !== "function") {
        return null;
    }

    const handleSubmit = async (event: any) => {
        event.preventDefault();
        try {
            if (error) {
                throw new Error(error);
            }
            if (!contractAddress) {
                throw new Error("contract address is required");
            }
            setTxhash(null);
            setTxResult("");
            const contract = new Contract(contractAddress, [abiObj], wallet);

            const txOpts: any = {
                gasPrice: tx.gasPrice,
                gasLimit: tx.gasLimit,
                value: tx.value,
            };

            if (callStatic && blockTag) {
                if (!Number.isNaN(Number(blockTag))) {
                    txOpts.blockTag = Number(blockTag);
                } else {
                    txOpts.blockTag = blockTag;
                }
            }

            const contractArgs = Object.values(args).reduce((acc: any[], val: any, i: number) => {
                if (abiObj.inputs[i].type?.endsWith("[]") && typeof val == "string") {
                    val = val.split(",").map((x: string) => x.trim());
                }
                acc.push(val);
                return acc;
            }, []);

            const constructGsafeTx = false;
            if (constructGsafeTx) {
                const { chainId } = await wallet.provider.getNetwork();
                const gsafeOutput: any = {
                    version: "1.0",
                    chainId: chainId.toString(),
                    createdAt: Date.now(),
                    meta: {
                        name: "",
                        description: "",
                        txBuilderVersion: "",
                        createdFromSafeAddress: "",
                        createdFromOwnerAddress: "",
                        checksum: "",
                    },
                    transactions: [],
                };
                gsafeOutput.transactions.push({
                    to: contractAddress,
                    data: null,
                    value: tx.value || "0",
                    contractMethod: abiObj,
                    contractInputsValues: contractArgs.reduce((acc: any, value: any, i: number) => {
                        acc[abiObj.inputs[i].name] = value;
                        return acc;
                    }, {}),
                });
            }
            const res = await contract[callStatic ? "callStatic" : "functions"][abiObj.name](...contractArgs, txOpts);
            setTxhash(res?.hash);
            const handleSetTxResult = (res: TransactionResult) => {
                setTxResult(JSON.stringify(res, null, 2));
            };

            // Usage
            const jsonString = JSON.stringify(res, null, 2);
            const parsedResult: TransactionResult = JSON.parse(jsonString);
            handleSetTxResult(parsedResult);
            // setTxResult(JSON.stringify(res, null, 2));
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    };
    const updateGasLimit = (val: string) => {
        setGasLimit(val);
        localStorage.setItem("gasLimit", val);
    };
    const updateGasPrice = (val: string) => {
        setGasPrice(val);
        localStorage.setItem("gasPrice", val);
    };
    const updateValue = (val: string) => {
        setValue(val);
        localStorage.setItem("value", val);
    };
    const updateNonce = (val: string) => {
        setNonce(val);
        localStorage.setItem("nonce", val);
    };
    const updateBlockTag = (val: string) => {
        setBlockTag(val);
        localStorage.setItem("blockTag", val);
    };
    const updateCallStatic = (event: any) => {
        const { checked } = event.target;
        setCallStatic(checked);
        localStorage.setItem("callStatic", checked);
    };

    const txLink = txhash ? getTxExplorerUrl(txhash, network) : null;
    const stateMutability = abiObj?.stateMutability;
    const methodType = abiObj?.type;
    const isWritable = ["nonpayable", "payable"].includes(stateMutability) && methodType === "function";

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label style={{ marginBottom: "0.5rem" }}>
                    <strong>{abiObj.name}</strong> {stateMutability ? `(${stateMutability})` : null} ({isWritable ? "writable" : "read-only"})
                </label>
                {!!methodSig && (
                    <div style={{ margin: "0.5rem 0" }}>
                        method signature: <code>{methodSig}</code>
                    </div>
                )}
                {abiObj?.inputs?.map((input: any, i: number) => {
                    const convertTextToHex = (event: SyntheticEvent) => {
                        event.preventDefault();
                        try {
                            const newArgs = Object.assign({}, args);
                            if (!utils.isHexString(args[i])) {
                                newArgs[i] = utils.hexlify(Buffer.from(args[i]));
                                localStorage.setItem(cacheKey, JSON.stringify(newArgs));
                                setArgs(newArgs);
                            }
                        } catch (err) {
                            alert(err);
                        }
                    };
                    let inputValue = args[i];
                    if (Array.isArray(inputValue)) {
                        try {
                            inputValue = JSON.stringify(inputValue);
                        } catch (err) {}
                    }
                    return (
                        <div key={i}>
                            <label>
                                <div className="d-flex">
                                    <span className="my-2">
                                        {input.name} ({input.type}) *
                                    </span>
                                    {input.type === "address" && windowWeb3 ? (
                                        <button
                                            style={{ width: "15%" }}
                                            className="my-1 mx-2"
                                            onClick={async (event: SyntheticEvent) => {
                                                event.preventDefault();
                                                const provider = new providers.Web3Provider(windowWeb3, "any");
                                                const newArgs = Object.assign({}, args);
                                                newArgs[i] = await provider?.getSigner()?.getAddress();
                                                localStorage.setItem(cacheKey, JSON.stringify(newArgs));
                                                setArgs(newArgs);
                                            }}
                                        >
                                            from web3
                                        </button>
                                    ) : null}
                                </div>
                                {input.type?.startsWith("bytes") ? (
                                    <>
                                        <span>({input.type?.includes("[]") ? "must be array of hex" : "must be hex"})</span>
                                        &nbsp;
                                        <button className="w-200 my-1" onClick={convertTextToHex}>
                                            hexlify
                                        </button>
                                    </>
                                ) : null}
                            </label>
                            <TextInput
                                value={inputValue}
                                placeholder={input.type}
                                onChange={(val: string) => {
                                    val = val.trim();
                                    const newArgs = Object.assign({}, args);
                                    if (input.type === "address") {
                                        if (val) {
                                            try {
                                                val = utils.getAddress(val);
                                            } catch (err) {
                                                // noop
                                            }
                                        }
                                    }
                                    newArgs[i] = val;
                                    localStorage.setItem(cacheKey, JSON.stringify(newArgs));
                                    setArgs(newArgs);
                                }}
                            />
                        </div>
                    );
                })}
                {abiObj?.inputs.length ? <small>* = Required</small> : null}
                <div style={{ padding: "1rem" }}>
                    <div className="d-flex">
                        <input type="checkbox" className="cursor-pointer" onChange={(e) => setChecked(e.target.checked)} />
                        <label style={{ marginBottom: "0.5rem" }} className="mx-2 mt-2">
                            Transaction options (optional)
                        </label>
                    </div>
                    {checked ? (
                        <>
                            <label>gas limit</label>
                            <TextInput value={gasLimit} placeholder={"gas limit"} onChange={updateGasLimit} />
                            <label>gas price (gwei)</label>
                            <TextInput value={gasPrice} placeholder={"gas price"} onChange={updateGasPrice} />
                            <label>value (wei)</label>
                            <TextInput value={value} placeholder={"value"} onChange={updateValue} />
                            <label>nonce</label>
                            <TextInput value={nonce} placeholder={"nonce"} onChange={updateNonce} />
                            <label>block tag (for static calls)</label>
                            <TextInput value={blockTag} placeholder={"latest"} onChange={updateBlockTag} />
                            {abiObj?.outputs.length ? (
                                <div>
                                    <label style={{ marginBottom: "0.5rem" }}>Return values</label>
                                    <ol>
                                        {abiObj?.outputs?.map((obj: any) => {
                                            return (
                                                <li key={obj.name}>
                                                    {obj.name} ({obj.type})
                                                </li>
                                            );
                                        })}
                                    </ol>
                                </div>
                            ) : null}
                        </>
                    ) : (
                        ""
                    )}
                </div>
                {tx && (
                    <div>
                        <label style={{ marginBottom: "0.5rem" }}>Transaction object</label>
                        <pre>{JSON.stringify(tx, null, 2)}</pre>
                    </div>
                )}
                <input type="checkbox" className="mx-2" checked={callStatic} onChange={updateCallStatic} />
                call static
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        Submit
                    </button>
                </div>
            </form>
            <h6>Output:</h6>
            <pre>{txResult}</pre>
            {/* {txLink && (
                <a href={txLink} target="_blank" rel="noopener noreferrer">
                    {txLink}
                </a>
            )} */}
        </div>
    );
}

export function SendEth(props: any) {
    const { wallet } = props;
    const [address, setAddress] = useState<string>("");
    const [balance, setBalance] = useState<string>("");
    const [amount, setAmount] = useState(localStorage.getItem("sendEthAmount"));
    const [recipient, setRecipient] = useState(localStorage.getItem("sendEthRecipient"));
    const [result, setResult] = useState<any>(null);
    useEffect(() => {
        const update = async () => {
            setAddress("");
            setBalance("");
            if (!wallet) {
                return;
            }
            let signer: Signer;
            if (wallet._isSigner) {
                signer = wallet;
            } else if (wallet.getSigner) {
                signer = await wallet.getSigner();
            } else {
                return;
            }
            try {
                const _address = await signer.getAddress();
                setAddress(_address);
                const _balance = await signer.getBalance();
                setBalance(utils.formatUnits(_balance.toString(), 18));
            } catch (err) {
                console.error(err);
            }
        };
        update();
    }, [wallet]);
    useEffect(() => {
        localStorage.setItem("sendEthAmount", amount || "");
    }, [amount]);
    useEffect(() => {
        localStorage.setItem("sendEthRecipient", recipient || "");
    }, [recipient]);
    const handleAmountChange = (value: string) => {
        setAmount(value);
    };
    const handleRecipientChange = (value: string) => {
        setRecipient(value);
    };
    const send = async () => {
        setResult(null);
        if (!amount) {
            throw new Error("amount is required");
        }
        if (!recipient) {
            throw new Error("recipient is required");
        }
        const tx = await wallet.sendTransaction({
            to: recipient,
            value: BigNumber.from(amount),
        });
        setResult(tx);
        tx.wait((receipt: any) => {
            setResult(receipt);
        });
    };
    const handleSubmit = async (event: any) => {
        event.preventDefault();
        try {
            await send();
        } catch (err) {
            alert(err.message);
        }
    };
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Address</label>
                    <div>{address}</div>
                </div>
                <div>
                    <label>Balance</label>
                    <div>{balance} ETH</div>
                </div>
                <div>
                    <label>Amount (uint256) *</label>
                    <TextInput value={amount} onChange={handleAmountChange} placeholder="uint256" />
                </div>
                <div>
                    <label>Recipient (address) *</label>
                    <TextInput value={recipient} onChange={handleRecipientChange} placeholder="address" />
                </div>
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        send
                    </button>
                </div>
            </form>
            <div>
                <pre>{result ? JSON.stringify(result, null, 2) : ""}</pre>
            </div>
        </div>
    );
}

export function GetTx(props: any) {
    const { provider } = props;
    const [txHash, setTxHash] = useState(localStorage.getItem("getTxHash"));
    const [result, setResult] = useState(null);
    useEffect(() => {
        localStorage.setItem("getTxHash", txHash || "");
    }, [txHash]);
    const handleTxHashChange = (value: string) => {
        setTxHash(value);
    };
    const getTx = async () => {
        try {
            setResult(null);
            const _tx = await provider.getTransaction(txHash);
            setResult(_tx);
        } catch (err) {
            alert(err.message);
        }
    };
    const handleSubmit = (event: any) => {
        event.preventDefault();
        getTx();
    };
    const _result = JSON.stringify(result, null, 2);
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label>Transaction hash</label>
                <TextInput value={txHash} onChange={handleTxHashChange} placeholder="hash" />
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        get transaction
                    </button>
                </div>
            </form>
            <div>
                <pre>{_result}</pre>
            </div>
        </div>
    );
}

export function TxReceipt(props: any) {
    const { provider } = props;
    const [txHash, setTxHash] = useState(localStorage.getItem("txReceiptHash"));
    const [receipt, setReceipt] = useState(null);
    useEffect(() => {
        localStorage.setItem("txReceiptHash", txHash || "");
    }, [txHash]);
    const handleTxHashChange = (value: string) => {
        setTxHash(value);
    };
    const getReceipt = async () => {
        try {
            setReceipt(null);
            const _receipt = await provider.getTransactionReceipt(txHash);
            setReceipt(_receipt);
        } catch (err) {
            alert(err.message);
        }
    };
    const handleSubmit = (event: any) => {
        event.preventDefault();
        getReceipt();
    };
    const result = JSON.stringify(receipt, null, 2);
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label>Transaction hash</label>
                <TextInput value={txHash} onChange={handleTxHashChange} placeholder="hash" />
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        get receipt
                    </button>
                </div>
            </form>
            <div>
                <pre>{result}</pre>
            </div>
        </div>
    );
}

export function GetGasPrice(props: any) {
    const { provider } = props;
    const [gasPrice, setGasPrice] = useState<any>(null);
    const getGasPrice = async () => {
        setGasPrice(null);
        const _gasPrice = await provider.getGasPrice();
        setGasPrice(_gasPrice?.toString());
    };
    const handleSubmit = (event: any) => {
        event.preventDefault();
        getGasPrice();
    };

    const gasPriceGwei = gasPrice ? utils.formatUnits(gasPrice, 9) : "";

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        get gas price
                    </button>
                </div>
            </form>
            <div>
                <div>
                    {!!gasPrice && (
                        <>
                            <code>{gasPrice}</code> wei
                        </>
                    )}
                </div>
                <div>
                    {!!gasPriceGwei && (
                        <>
                            <code>{gasPriceGwei}</code> gwei
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export function GetFeeData(props: any) {
    const { provider } = props;
    const [feeData, setFeeData] = useState<any>(null);
    const getFeeData = async () => {
        setFeeData(null);
        const _feeData = await provider.getFeeData();
        setFeeData(_feeData);
    };
    const handleSubmit = (event: any) => {
        event.preventDefault();
        getFeeData();
    };
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        get gas fee data
                    </button>
                </div>
            </form>
            <div>{!!feeData && <pre>{JSON.stringify(feeData, null, 2)}</pre>}</div>
        </div>
    );
}

export function GetNonce(props: any) {
    const { provider } = props;
    const [address, setAddress] = useState(localStorage.getItem("getNonceAddress"));
    const [nonce, setNonce] = useState<number | null>(null);
    useEffect(() => {
        localStorage.setItem("getNonceAddress", address || "");
    }, [address]);
    const [pending, setPending] = useState<boolean>(() => {
        try {
            return Boolean(localStorage.getItem("getTransactionCountPending") ?? true);
        } catch (err) {}
        return true;
    });
    const [blockTag, setBlockTag] = useState<string>(() => {
        try {
            return localStorage.getItem("getTransactionCountBlockTag") || "";
        } catch (err) {}
        return "";
    });
    useEffect(() => {
        localStorage.setItem("getTransactionCountBlockTag", blockTag || "");
    }, [blockTag]);
    useEffect(() => {
        localStorage.setItem("getTransactionCountPending", `${pending}`);
    }, [pending]);
    const handleAddressChange = (value: string) => {
        setAddress(value);
    };
    const getNonce = async () => {
        try {
            setNonce(null);
            let _blockTag: any = blockTag;
            if (blockTag) {
                if (!Number.isNaN(Number(blockTag))) {
                    _blockTag = Number(blockTag);
                } else {
                    _blockTag = blockTag;
                }
            }
            if (pending) {
                _blockTag = "pending";
            }
            if (!_blockTag) {
                _blockTag = "latest";
            }

            const _nonce = await provider.getTransactionCount(address, _blockTag);
            setNonce(Number(_nonce.toString()));
        } catch (err) {
            alert(err.message);
        }
    };
    const handleSubmit = (event: any) => {
        event.preventDefault();
        getNonce();
    };
    const updateBlockTagCheck = (event: any) => {
        const { checked } = event.target;
        setPending(checked);
    };
    const handleBlockTag = (_value: string) => {
        setBlockTag(_value);
    };
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label>Address</label>
                <TextInput value={address} onChange={handleAddressChange} placeholder="0x" />
                <label>Block number (optional)</label>
                <TextInput value={blockTag} onChange={handleBlockTag} placeholder="latest" disabled={pending} />
                <label>
                    <input className="mx-2 mt-2" type="checkbox" checked={pending} onChange={updateBlockTagCheck} />
                    pending
                </label>
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        get nonce
                    </button>
                </div>
            </form>
            <div>
                {nonce !== null && (
                    <pre>
                        {nonce} ({intToHex(nonce)})
                    </pre>
                )}
            </div>
        </div>
    );
}

export function ClearLocalStorage() {
    const handleSubmit = (event: any) => {
        event.preventDefault();
        try {
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
        } catch (err) {
            alert(err.message);
        }
    };
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <button className="w-200 mx-2 w-200 py-2" type="submit">
                    Clear local storage
                </button>
            </form>
        </div>
    );
}

export function IPNSContentHash(props: any) {
    const [value, setValue] = useState<string>(localStorage.getItem("ipnsContentHashValue" || "") || "");
    const [result, setResult] = useState<string | null>(null);
    useEffect(() => {
        localStorage.setItem("ipnsContentHashValue", value || "");
    }, [value]);
    const handleValueChange = (_value: string) => {
        setValue(_value);
    };
    const encode = () => {
        try {
            setResult(null);
            if (value) {
                const base58content = base58.encode(Buffer.concat([Buffer.from([0, value.length]), Buffer.from(value)]));
                const ensContentHash = `0x${contentHash.encode("ipns-ns", base58content)}`;
                setResult(ensContentHash);
            }
        } catch (err) {
            alert(err.message);
        }
    };
    const handleSubmit = (event: any) => {
        event.preventDefault();
        encode();
    };
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label>IPNS ContentHash</label>
                <TextInput value={value} onChange={handleValueChange} placeholder="app.example.com" />
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        encode
                    </button>
                </div>
            </form>
            <div>{result !== null && <pre>{result}</pre>}</div>
        </div>
    );
}

export function IpfsCoder(props: any) {
    const [v1Value, setV1Value] = useState<string>(localStorage.getItem("ipfsV1Value" || "") || "");
    const [v0Value, setV0Value] = useState<string>(localStorage.getItem("ipfsV0Value" || "") || "");
    const [result, setResult] = useState<string | null>(null);
    useEffect(() => {
        localStorage.setItem("ipfsV1Value", v1Value || "");
    }, [v1Value]);
    useEffect(() => {
        localStorage.setItem("ipfsV0Value", v0Value || "");
    }, [v0Value]);
    const handleV1ValueChange = (_value: string = "") => {
        setV1Value(_value);
    };
    const handleV0ValueChange = (_value: string = "") => {
        setV0Value(_value);
    };
    const toV1 = () => {
        try {
            setResult(null);
            setResult(new CID(v0Value).toV1().toString("base16"));
        } catch (err) {
            alert(err.message);
        }
    };
    const toV0 = () => {
        try {
            setResult(null);
            setResult(new CID(v1Value).toV0().toString());
        } catch (err) {
            alert(err.message);
        }
    };
    const handleV0Submit = (event: any) => {
        event.preventDefault();
        toV0();
    };
    const handleV1Submit = (event: any) => {
        event.preventDefault();
        toV1();
    };
    return (
        <div>
            <form onSubmit={handleV1Submit}>
                <label>To V1</label>
                <TextInput value={v0Value} onChange={handleV0ValueChange} placeholder="QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx" />
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        convert
                    </button>
                </div>
            </form>
            <form onSubmit={handleV0Submit}>
                <label>To V0</label>
                <TextInput value={v1Value} onChange={handleV1ValueChange} placeholder="f017012209f668b20cfd24cdbf9e1980fa4867d08c67d2caf8499e6df81b9bf0b1c97287d" />
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        convert
                    </button>
                </div>
            </form>
            <div>{result !== null && <pre>{result}</pre>}</div>
        </div>
    );
}

// more info: https://github.com/ensdomains/ens-app/issues/849#issuecomment-777088950
// ens public resolver: 0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41
export function ContentHashCoder(props: any) {
    const [shouldBase58EncodeContent, setShouldBase58EncodeContent] = useState<boolean>(false);
    const [encodeValue, setEncodeValue] = useState<string>(localStorage.getItem("contentHashEncodeValue" || "") || "");
    const [decodeValue, setDecodeValue] = useState<string>(localStorage.getItem("contentHashDecodeValue" || "") || "");
    const [result, setResult] = useState<string | null>(null);
    useEffect(() => {
        localStorage.setItem("contentHashEncodeValue", encodeValue || "");
    }, [encodeValue]);
    useEffect(() => {
        localStorage.setItem("contentHashDecodeValue", decodeValue || "");
    }, [decodeValue]);
    const handleEncodeValueChange = (_value: string = "") => {
        setEncodeValue(_value);
    };
    const handleDecodeValueChange = (_value: string = "") => {
        setDecodeValue(_value);
    };
    const encode = () => {
        try {
            setResult(null);
            const matched = encodeValue.match(/^(ipfs-ns|ipfs|ipns|ipns-ns|bzz|onion|onion3):\/\/(.*)/) || encodeValue.match(/\/(ipfs)\/(.*)/) || encodeValue.match(/\/(ipns)\/(.*)/);
            if (!matched) {
                throw new Error("could not encode (missing protocol)");
            }

            const contentType = matched[1];
            const content = matched[2];
            let base58content = content;

            if (shouldBase58EncodeContent) {
                base58content = base58.encode(Buffer.concat([Buffer.from([0, content.length]), Buffer.from(content)]));
            }

            let ensContentHash = "";
            if (shouldBase58EncodeContent) {
                ensContentHash = contentHash.encode(contentType, base58content);
            } else {
                ensContentHash = contentHash2.encode(contentType, base58content);
            }
            ensContentHash = `0x${ensContentHash}`;
            setResult(ensContentHash);
        } catch (err) {
            alert(err.message);
        }
    };
    const decode = () => {
        try {
            setResult(null);
            const _value = decodeValue.replace("0x", "");
            setResult(`${contentHash2.getCodec(_value)}://${contentHash2.decode(_value)}`);
        } catch (err) {
            alert(err.message);
        }
    };
    const handleEncodeSubmit = (event: any) => {
        event.preventDefault();
        encode();
    };
    const handleDecodeSubmit = (event: any) => {
        event.preventDefault();
        decode();
    };
    const handleCheckboxChange = (event: any) => {
        setShouldBase58EncodeContent(event.target.checked);
    };
    return (
        <div>
            <form onSubmit={handleEncodeSubmit}>
                <label>
                    Encode <small>(e.g. {`ipns-ns://<peer-id>`})</small>
                </label>
                <TextInput value={encodeValue} onChange={handleEncodeValueChange} placeholder="ipfs-ns://QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx" />
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <input type="checkbox" checked={shouldBase58EncodeContent} onChange={handleCheckboxChange} />
                    base58 encode content <small>(ie. using domain)</small>
                </div>
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        encode
                    </button>
                </div>
            </form>
            <form onSubmit={handleDecodeSubmit}>
                <label>Decode</label>
                <TextInput value={decodeValue} onChange={handleDecodeValueChange} placeholder="0xe301017012209f668b20cfd24cdbf9e1980fa4867d08c67d2caf8499e6df81b9bf0b1c97287d" />
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        decode
                    </button>
                </div>
            </form>
            <div>{result !== null && <pre>{result}</pre>}</div>
        </div>
    );
}

export function ChecksumAddress(props: any) {
    const [value, setValue] = useState<string>(localStorage.getItem("checksumAddressValue" || "") || "");
    const [result, setResult] = useState<string | null>(null);
    useEffect(() => {
        localStorage.setItem("checksumAddressValue", value || "");
    }, [value]);
    const handleValueChange = (_value: string) => {
        setValue(_value);
    };
    const checksum = () => {
        try {
            setResult(null);
            if (!value) {
                return;
            }
            setResult(utils.getAddress(value.trim()));
        } catch (err) {
            alert(err.message);
        }
    };
    const handleSubmit = (event: any) => {
        event.preventDefault();
        checksum();
    };
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label>Address</label>
                <TextInput value={value} onChange={handleValueChange} placeholder="0x..." />
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        checksum
                    </button>
                </div>
            </form>
            <div>{result}</div>
        </div>
    );
}

export function PrivateKeyToAddress(props: any) {
    const [value, setValue] = useState<string>(localStorage.getItem("privateKeyToAddressValue" || "") || "");
    const [result, setResult] = useState<string | null>(null);
    useEffect(() => {
        localStorage.setItem("privateKeyToAddressValue", value || "");
    }, [value]);
    const handleValueChange = (_value: string) => {
        setValue(_value);
    };
    const update = () => {
        try {
            setResult(null);
            if (!value) {
                return;
            }
            setResult(privateKeyToAddress(value.trim().replace("0x", "")));
        } catch (err) {
            alert(err.message);
        }
    };
    const handleSubmit = (event: any) => {
        event.preventDefault();
        update();
    };
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label>Private key</label>
                <TextInput value={value} onChange={handleValueChange} placeholder="0x..." />
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        get address
                    </button>
                </div>
            </form>
            <div>{result}</div>
        </div>
    );
}

export function PrivateKeyToPublicKey(props: any) {
    const [value, setValue] = useState<string>(localStorage.getItem("privateKeyToPublicKeyValue" || "") || "");
    const [result, setResult] = useState<string | null>(null);
    useEffect(() => {
        localStorage.setItem("privateKeyToPublicKeyValue", value || "");
    }, [value]);
    const handleValueChange = (_value: string) => {
        setValue(_value);
    };
    const update = () => {
        try {
            setResult(null);
            if (!value) {
                return;
            }
            setResult(privateKeyToPublicKey(value.trim().replace("0x", "")).toString("hex"));
        } catch (err) {
            alert(err.message);
        }
    };
    const handleSubmit = (event: any) => {
        event.preventDefault();
        update();
    };
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label>Private key</label>
                <TextInput value={value} onChange={handleValueChange} placeholder="0x..." />
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        get public key
                    </button>
                </div>
            </form>
            <div style={{ wordBreak: "break-all" }}>{result}</div>
        </div>
    );
}

export function PublicKeyToAddress(props: any) {
    const [value, setValue] = useState<string>(localStorage.getItem("publicKeyToAddressValue" || "") || "");
    const [result, setResult] = useState<string | null>(null);
    useEffect(() => {
        localStorage.setItem("publicKeyToAddressValue", value || "");
    }, [value]);
    const handleValueChange = (_value: string) => {
        setValue(_value);
    };
    const update = () => {
        try {
            setResult(null);
            if (!value) {
                return;
            }
            setResult(publicKeyToAddress(value.trim().replace("0x", "")));
        } catch (err) {
            alert(err.message);
        }
    };
    const handleSubmit = (event: any) => {
        event.preventDefault();
        update();
    };
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label>Public key</label>
                <TextInput value={value} onChange={handleValueChange} placeholder="0x..." />
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        get address
                    </button>
                </div>
            </form>
            <div>{result}</div>
        </div>
    );
}

export function HashMessage(props: any) {
    const [value, setValue] = useState<string>(localStorage.getItem("hashMessageValue" || "") || "");
    const [result, setResult] = useState<string | null>(null);
    useEffect(() => {
        localStorage.setItem("hashMessageValue", value || "");
    }, [value]);
    const handleValueChange = (_value: string) => {
        setValue(_value);
    };
    const hash = async () => {
        try {
            setResult(null);
            const hashed = utils.hashMessage(value);
            setResult(hashed);
        } catch (err) {
            alert(err.message);
        }
    };
    const handleSubmit = (event: any) => {
        event.preventDefault();
        hash();
    };
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label>Message</label>
                <TextInput value={value} onChange={handleValueChange} placeholder="message" variant="textarea" />
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        hash message
                    </button>
                </div>
            </form>
            <div style={{ marginTop: "1rem" }}>{result}</div>
        </div>
    );
}

export function SignMessage(props: any) {
    const { wallet } = props;
    const [loading, setLoading] = useState<boolean>(false);
    const [value, setValue] = useState<string>(localStorage.getItem("signMessageValue" || "") || "");
    const [result, setResult] = useState<string | null>(null);
    useEffect(() => {
        localStorage.setItem("signMessageValue", value || "");
    }, [value]);
    const handleValueChange = (_value: string) => {
        setValue(_value);
    };
    const encode = async () => {
        try {
            setResult(null);
            setLoading(true);
            const signature = await wallet.signMessage(value);
            setResult(signature);
        } catch (err) {
            alert(err.message);
        }
        setLoading(false);
    };
    const handleSubmit = (event: any) => {
        event.preventDefault();
        encode();
    };
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label>Message</label>
                <TextInput value={value} onChange={handleValueChange} placeholder="message" variant="textarea" />
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        sign message
                    </button>
                </div>
            </form>
            <div style={{ marginTop: "1rem" }}>
                {loading && <span>waiting for wallet...</span>}
                {result}
            </div>
        </div>
    );
}

export function VerifySignature(props: any) {
    const [hashMessage, setHashMessage] = useState<boolean>(localStorage.getItem("verifySignatureHashMessage") === "true");
    const [message, setMessage] = useState<string>(localStorage.getItem("verifySignatureMessage" || "") || "");
    const [signature, setSignature] = useState<string>(localStorage.getItem("verifySignatureSignature" || "") || "");
    const [address, setAddress] = useState<string>(localStorage.getItem("verifySignatureAddress" || "") || "");
    const [result, setResult] = useState<string | null>(null);
    useEffect(() => {
        localStorage.setItem("verifySignatureMessage", message || "");
    }, [message]);
    useEffect(() => {
        localStorage.setItem("verifySignatureSignature", signature || "");
    }, [signature]);
    useEffect(() => {
        localStorage.setItem("verifySignatureAddress", address || "");
    }, [address]);
    useEffect(() => {
        localStorage.setItem("verifySignatureHashMessage", `${hashMessage || ""}`);
    }, [hashMessage]);
    const handleMessageChange = (_value: string) => {
        setMessage(_value);
    };
    const handleSignatureChange = (_value: string) => {
        setSignature(_value);
    };
    const handleAddressChange = (_value: string) => {
        setAddress(_value);
    };
    const updateHashMessage = (event: any) => {
        const checked = event.target.checked;
        setHashMessage(checked);
    };
    const recover = async () => {
        try {
            setResult(null);
            if (!message) {
                throw new Error("message is required");
            }
            if (!signature) {
                throw new Error("signature is required");
            }
            let _message = message;
            if (hashMessage) {
                _message = utils.hashMessage(message);
            }
            const recoveredAddress = utils.recoverAddress(_message, signature);
            if (address) {
                const verified = recoveredAddress === utils.getAddress(address);
                setResult(`${verified}`);
            } else {
                setResult(recoveredAddress);
            }
        } catch (err) {
            alert(err.message);
        }
    };
    const handleSubmit = (event: any) => {
        event.preventDefault();
        recover();
    };
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label>Message</label>
                <TextInput value={message} onChange={handleMessageChange} placeholder="message" variant="textarea" />
                <div>
                    <input className="mx-2" type="checkbox" checked={hashMessage} onChange={updateHashMessage} />
                    hash message
                </div>
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <label className="mx-2">Signature</label>
                    <TextInput value={signature} onChange={handleSignatureChange} placeholder="signature" />
                </div>
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <label className="mx-2">Address</label>
                    <TextInput value={address} onChange={handleAddressChange} placeholder="address" />
                </div>
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        verify
                    </button>
                </div>
            </form>
            <div style={{ marginTop: "1rem" }}>{result}</div>
        </div>
    );
}

export function EncryptMessage(props: any) {
    const provider = (window as any).ethereum;
    const [value, setValue] = useState(localStorage.getItem("encryptValue") || "");
    const [result, setResult] = useState<any>("");
    useEffect(() => {
        localStorage.setItem("encryptValue", value || "");
    }, [value]);
    async function getPublicKey() {
        const accounts = await provider.enable();
        const encryptionPublicKey = await provider.request({
            method: "eth_getEncryptionPublicKey",
            params: [accounts[0]],
        });

        return encryptionPublicKey;
    }
    async function encrypt(msg: string) {
        const encryptionPublicKey = await getPublicKey();
        const buf = Buffer.from(JSON.stringify(sigUtil.encrypt(encryptionPublicKey, { data: msg }, "x25519-xsalsa20-poly1305")), "utf8");

        return "0x" + buf.toString("hex");
    }

    async function encryptHandler() {
        try {
            setResult("");
            const encMsg = await encrypt(value);
            setResult(encMsg);
        } catch (err) {
            alert(err.message);
            console.error(err);
        }
    }
    const handleValueChange = (value: string) => {
        setValue(value);
    };
    const handleSubmit = (event: any) => {
        event.preventDefault();
        encryptHandler();
    };
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label>Message to encrypt with public key</label>
                <TextInput value={value} onChange={handleValueChange} placeholder="message" variant="textarea" />
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        encrypt
                    </button>
                </div>
            </form>
            <div style={{ marginTop: "1rem" }}>{result}</div>
        </div>
    );
}

export function DecryptMessage(props: any) {
    const provider = (window as any).ethereum;
    const [value, setValue] = useState(localStorage.getItem("decryptValue") || "");
    const [result, setResult] = useState<any>("");
    useEffect(() => {
        localStorage.setItem("decryptValue", value || "");
    }, [value]);

    async function decrypt(encMsg: string) {
        const accounts = await provider.enable();
        const decMsg = await provider.request({
            method: "eth_decrypt",
            params: [encMsg, accounts[0]],
        });

        return decMsg;
    }

    async function decryptHandler() {
        try {
            setResult("");
            const decMsg = await decrypt(value);
            setResult(decMsg);
        } catch (err) {
            alert(err.message);
            console.error(err);
        }
    }
    const handleValueChange = (value: string) => {
        setValue(value);
    };
    const handleSubmit = (event: any) => {
        event.preventDefault();
        decryptHandler();
    };
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label>Encrypted message to decrypt with private key (hex)</label>
                <TextInput value={value} onChange={handleValueChange} placeholder="0x..." variant="textarea" />
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        decrypt
                    </button>
                </div>
            </form>
            <div style={{ marginTop: "1rem" }}>{result}</div>
        </div>
    );
}

export function GasCostCalculator(props: any) {
    const { provider } = props;
    const defaultGasLimit = "2100";
    const [ethUsdPrice, setEthUsdPrice] = useState(localStorage.getItem("gasCostCalculatorEthUsdPrice") || "");
    const [gasPrice, setGasPrice] = useState(localStorage.getItem("gasCostCalculatorGasPrice") || "");
    const [gasLimit, setGasLimit] = useState(localStorage.getItem("gasCostCalculatorGasLimit") || defaultGasLimit);
    const [result, setResult] = useState<any>("");
    const [usingCustomGasPrice, setUsingCustomGasPrice] = useState(false);
    const [usingCustomEthUsdPrice, setUsingCustomEthUsdPrice] = useState(false);
    useEffect(() => {
        localStorage.setItem("gasCostCalculatorEthUsdPrice", ethUsdPrice || "");
    }, [ethUsdPrice]);
    useEffect(() => {
        localStorage.setItem("gasCostCalculatorGasPrice", gasPrice || "");
    }, [gasPrice]);
    useEffect(() => {
        localStorage.setItem("gasCostCalculatorGasLimit", gasLimit || "");
    }, [gasLimit]);

    useEffect(() => {
        async function getGasPrice() {
            try {
                const _gasPrice = await provider.getGasPrice();
                if (!gasPrice && !usingCustomGasPrice) {
                    setGasPrice(utils.formatUnits(_gasPrice.toString(), 9));
                }
            } catch (err) {}
        }
        getGasPrice().catch(console.error);
    }, [provider, gasPrice, usingCustomGasPrice]);

    useEffect(() => {
        async function getEthUsdPrice() {
            try {
                const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
                const json = await res.json();
                const _ethUsdPrice = json.ethereum.usd.toString();
                if (!ethUsdPrice && !usingCustomEthUsdPrice) {
                    setEthUsdPrice(_ethUsdPrice);
                }
            } catch (err) {}
        }
        getEthUsdPrice().catch(console.error);
    }, [provider, ethUsdPrice, usingCustomEthUsdPrice]);

    const calculate = useCallback(async () => {
        try {
            setResult("");
            const _gasPrice = Number(gasPrice);
            const _gasLimit = Number(gasLimit);
            const _ethUsdPrice = Number(ethUsdPrice);
            const requiredGas = Number(utils.formatUnits(utils.parseUnits((_gasPrice * _gasLimit * _ethUsdPrice).toString(), 9), 18));
            const result = Number(requiredGas.toFixed(2)).toString();
            setResult(result);
        } catch (err) {
            alert(err.message);
            console.error(err);
        }
    }, [ethUsdPrice, gasPrice, gasLimit]);

    useEffect(() => {
        if (!usingCustomGasPrice && !usingCustomEthUsdPrice && gasPrice && ethUsdPrice && gasLimit === defaultGasLimit) {
            calculate();
        }
    }, [usingCustomGasPrice, usingCustomEthUsdPrice, gasPrice, ethUsdPrice, gasLimit, calculate]);

    async function reset(event: any) {
        event.preventDefault();
        setEthUsdPrice("");
        setGasPrice("");
        setGasLimit(defaultGasLimit);
        setResult("");
        setUsingCustomGasPrice(false);
        setUsingCustomEthUsdPrice(false);
    }

    const handleEthUsdPriceChange = (value: string) => {
        setEthUsdPrice(value);
        setUsingCustomEthUsdPrice(true);
    };
    const handleGasPriceChange = (value: string) => {
        setGasPrice(value);
        setUsingCustomGasPrice(true);
    };
    const handleGasLimitChange = (value: string) => {
        setGasLimit(value);
    };
    const handleSubmit = (event: any) => {
        event.preventDefault();
        calculate();
    };
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label>ETH/USD</label>
                <TextInput value={ethUsdPrice} onChange={handleEthUsdPriceChange} placeholder="1500" />
                <label>Gas price (gwei)</label>
                <TextInput value={gasPrice} onChange={handleGasPriceChange} placeholder="22" />
                <label>Gas required (gasLimit)</label>
                <TextInput value={gasLimit} onChange={handleGasLimitChange} placeholder="21000" />
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        calculate
                    </button>
                </div>
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" onClick={reset}>
                        reset
                    </button>
                </div>
            </form>
            <div style={{ marginTop: "1rem" }}>Gas cost (USD): {result}</div>
        </div>
    );
}

export function MethodSignatureGenerator(props: any) {
    const [value, setValue] = useState(localStorage.getItem("methodSignatureGeneratorValue") || "");
    const [result, setResult] = useState<any>(null);
    const [normalizeValue, setNormalizedValue] = useState<any>("");
    useEffect(() => {
        localStorage.setItem("methodSignatureGeneratorValue", value || "");
    }, [value]);
    const handleValueChange = (value: string) => {
        setValue(value);
    };
    const update = async () => {
        try {
            setResult(null);
            setNormalizedValue("");
            if (!value) {
                throw new Error("value is required");
            }
            let _value = value.trim();
            _value = _value.replace(/^(function|event)/gi, "");
            const fnName = _value.split("(")[0].trim();
            _value = _value.replace(/.*?\((.*?)\).*/gi, "$1");
            const parts = _value.split(",");
            let args = [];
            for (const part of parts) {
                args.push(
                    part
                        .split(/\s+/)
                        .filter((x) => x)[0]
                        .trim()
                );
            }
            _value = `${fnName}(${args.join(",")})`;
            const res = `0x${(window as any).keccak256(_value).toString("hex")}`;
            setNormalizedValue(_value);
            setResult(res);
        } catch (err) {
            alert(err.message);
        }
    };
    const handleSubmit = (event: any) => {
        event.preventDefault();
        update();
    };

    let output = "";
    if (result) {
        output = `input:${normalizeValue}\nbyte4: ${result.slice(0, 10)}\nbytes32:${result}`;
    }
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label>Method or Event signature</label>
                <TextInput value={value} onChange={handleValueChange} placeholder="transfer(address,uint256)" />
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        get hash
                    </button>
                </div>
            </form>
            <div>
                <pre>{output}</pre>
            </div>
        </div>
    );
}

export function FourByteDictionary(props: any) {
    const [value, setValue] = useState(localStorage.getItem("fourByteValue") || "");
    const [result, setResult] = useState<any>(null);
    useEffect(() => {
        localStorage.setItem("fourByteValue", value || "");
    }, [value]);
    const handleValueChange = (value: string) => {
        setValue(value);
    };
    const update = async () => {
        try {
            setResult(null);
            if (!value) {
                throw new Error("method signature is required");
            }
            const res = await fourByte(value);
            setResult(res);
        } catch (err) {
            alert(err.message);
        }
    };
    const handleSubmit = (event: any) => {
        event.preventDefault();
        update();
    };
    const output = JSON.stringify(result, null, 2);
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <label>Method signature</label>
                <TextInput value={value} onChange={handleValueChange} placeholder="0xaabbccdd" />
                <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                    <button className="w-200 my-1" type="submit">
                        find
                    </button>
                </div>
            </form>
            <div>
                <pre>{output}</pre>
            </div>
        </div>
    );
}

function Home(props: any) {
    const { networkName, networkId } = props;
    let location = useLocation();

    interface TransactionResult {
        hash: string;
        // Other properties of the transaction result object, if any
    }
    const [txResult, setTxResult] = useState<TransactionResult | "">("");
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
    const [networkOption, setNetworkOption] = useState(() => {
        return localStorage.getItem("networkOption") || "mainnet";
    });
    const [rpcProviderUrl, setRpcProviderUrl] = useState<string>(() => {
        return localStorage.getItem("rpcProviderUrl") || "";
    });
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

            return providers.getDefaultProvider(net);
        } catch (err) {
            console.error(err);
        }

        return providers.getDefaultProvider("mainnet");
    });
    const [wallet, setWallet] = useState<any>(rpcProvider);
    const [walletAddress, setWalletAddress] = useState<string>("");
    const [contractAddress, setContractAddress] = useState(() => {
        return localStorage.getItem("contractAddress") || "";
    });
    const [newAbiName, setNewAbiName] = useState("");
    const [abiMethodFormShown, showAbiMethodForm] = useState(false);
    const [selectedAbi, setSelectedAbi] = useState(() => {
        const selected = localStorage.getItem("selectedAbi");
        return selected || "ERC20";
    });
    const [customAbis, setCustomAbis] = useState<any>(() => {
        try {
            return JSON.parse(localStorage.getItem("customAbis") || "") || {};
        } catch (err) {
            return {};
        }
    });
    const [customAbi, setCustomAbi] = useState(() => {
        return localStorage.getItem("customAbi") || "[]";
    });
    const [abis, setAbis] = useState<any>(() => {
        return { ...nativeAbis, ...customAbis };
    });
    const [abi, setAbi] = useState(() => {
        const selected = localStorage.getItem("selectedAbi") || Object.keys(abis)[0];
        return (abis as any)[selected];
    });

    const [abiOptions, setAbiOptions] = useState(() => {
        return Object.keys(abis);
    });
    const [selectedAbiMethod, setSelectedAbiMethod] = useState(() => {
        return localStorage.getItem("selectedAbiMethod") || "transfer";
    });

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
    useEffect(() => {
        const selected = (abis as any)[selectedAbi];
        if (selected) {
            setAbi(JSON.stringify(selected, null, 2));
        }
    }, [selectedAbi, abis]);
    useEffect(() => {
        const _abis = { ...nativeAbis, ...customAbis };
        setAbis(_abis);
        setAbiOptions(Object.keys(_abis).sort());
    }, [customAbis]);
    useEffect(() => {
        localStorage.setItem("selectedAbi", selectedAbi);
    }, [selectedAbi]);

    const handleRpcProviderUrlChange = (value: string) => {
        try {
            setRpcProviderUrl(value);
            localStorage.setItem("rpcProviderUrl", value);
            value = value.replace("{network}", networkOption);
            const provider = new providers.JsonRpcProvider(value.replace("{network}", networkOption));
            setRpcProvider(provider);
        } catch (err) {
            // noop
        }
    };
    const handleContractAddressChange = (value: string) => {
        value = value.trim();
        if (value) {
            try {
                value = utils.getAddress(value);
            } catch (err) {
                // noop
            }
        }
        setContractAddress(value);
        localStorage.setItem("contractAddress", value);
    };
    const handleSelectChange = (value: string) => {
        setAbiSelectedLabel(value);
        setSelectedAbi(value);
        const method = abis?.[value]?.find((x: any) => x?.type === "function")?.name ?? "";
        setSelectedAbiMethod(method);
        setTxResult("");
    };
    const handleAbiContent = (value: string) => {
        setCustomAbi(value);
        localStorage.setItem("customAbi", value);
    };
    const handleAddAbiClick = (event: any) => {
        event.preventDefault();
        showAbiMethodForm(true);
        setCustomAbi("");
    };
    const handleDeleteAbiClick = (event: any) => {
        event.preventDefault();
        try {
            const _customAbis = Object.assign({}, customAbis);
            delete _customAbis[selectedAbi];
            localStorage.setItem("customAbis", JSON.stringify(_customAbis));
            setCustomAbis(_customAbis);
            setSelectedAbi(Object.keys(nativeAbis)[0]);
        } catch (err) {
            alert(err);
        }
    };
    const handleSaveAbiClick = (event: any) => {
        event.preventDefault();
        try {
            if (!newAbiName) {
                throw new Error("ABI name is required");
            }
            if (!customAbi) {
                throw new Error("ABI content is required");
            }
            const name = newAbiName.trim();

            let abiJson: any;
            try {
                abiJson = JSON.parse(customAbi.trim());
                if (!Array.isArray(abiJson)) {
                    if (Array.isArray(abiJson.abi)) {
                        abiJson = abiJson.abi;
                    }
                }
            } catch (err) {
                const abiMethods = customAbi
                    .trim()
                    .split("\n")
                    .filter((x) => x);

                const iface = new ethers.utils.Interface(abiMethods);
                let functionsJson = Object.values(iface.functions || {});

                functionsJson = functionsJson.map((x: any) => {
                    const copy = JSON.parse(JSON.stringify(x));
                    if (!copy) {
                        return copy;
                    }
                    if (Array.isArray(copy.inputs)) {
                        for (let idx in copy.inputs) {
                            for (let key in copy.inputs[idx]) {
                                if (copy.inputs[idx][key] === null) {
                                    delete copy.inputs[idx][key];
                                }
                            }
                            delete copy.inputs[idx].baseType;
                            delete copy.inputs[idx]._isParamType;
                        }
                    }
                    delete copy.gas;
                    delete copy._isFragment;
                    return copy;
                });

                const eventsJson = Object.values(iface.events || {});
                abiJson = functionsJson.concat(...(eventsJson as any));
            }

            const newAbi = {
                [name]: abiJson,
            };
            const _customAbis = { ...customAbis, ...newAbi };
            localStorage.setItem("customAbis", JSON.stringify(_customAbis));
            setCustomAbis(_customAbis);
            showAbiMethodForm(false);
            setCustomAbi("");
            setNewAbiName("");
            setSelectedAbi(name);
            const method = abiJson?.find((x: any) => x?.type === "function")?.name ?? "";
            setSelectedAbiMethod(method);
        } catch (err) {
            alert(err);
        }
    };
    const handleCancelAbiClick = () => {
        // const handleCancelAbiClick: () => void = (event) => {
        // event.preventDefault();
        showAbiMethodForm(false);
        setCustomAbi("");
        setNewAbiName("");
    };
    const handleNewAbiNameChange = (value: string) => {
        setNewAbiName(value);
    };
    const [selectedLabel, setSelectedLabel] = useState<string>("");
    const [methodSearch, setMethodSearch] = useState("");
    const [abiSearch, setAbiSearch] = useState("");

    const [abiSelectedLabel, setAbiSelectedLabel] = useState<string>("");
    const renderMethodSelect = () => {
        try {
            const parsed = JSON.parse(abi);
            const options = parsed
                .map((obj: any) => {
                    let value = obj.type === "function" ? obj.name : null;
                    let label = value;
                    if (value && obj.signature) {
                        label = `${value} `;
                    }
                    return {
                        label,
                        value,
                    };
                })
                .filter((x: any) => x.value);

            const handleClick = (value: string, label: string) => {
                setTxResult("");
                setSelectedLabel(label);
                setSelectedAbiMethod(value);
                localStorage.setItem("selectedAbiMethod", value);
            };

            return (
                <>
                    <input className="mb-2 w-100" value={methodSearch} onChange={(e) => setMethodSearch(e.target.value)} placeholder="&#128269; Search.."></input>
                    <div style={{ height: "460px", overflow: "auto" }}>
                        {options
                            .filter((item: { label: string; value: string }, i: number) => {
                                return JSON.stringify(item).toLowerCase().indexOf(methodSearch.toLowerCase()) !== -1;
                            })
                            .map((item: { label: string; value: string }, i: number) => {
                                return (
                                    <div className={`hover-div cursor-poiner ${selectedLabel === item.label ? "selected" : ""}`} key={i} onClick={() => handleClick(item.value, item.label)}>
                                        {item.label}
                                    </div>
                                );
                            })}
                    </div>
                </>
            );
        } catch (err) {}
    };
    const renderMethodForm = () => {
        try {
            const parsed = JSON.parse(abi);
            const filtered = parsed.filter((x: any) => x.name === selectedAbiMethod);
            if (!filtered.length) return null;
            const obj = filtered[0];
            return (
                <div style={{ height: "506px", overflow: "auto" }}>
                    <AbiMethodForm key={obj.name} txResult={txResult} setTxResult={setTxResult} contractAddress={contractAddress} wallet={wallet} abi={obj} network={networkName} />
                </div>
            );
        } catch (err) {
            // noop
        }
    };

    return (
        <>
            <Helmet>
                <title>Ethereum smart contract interaction tool</title>
                <meta name="description" content="Eth smart contract interaction tool is a tool that lets you interact with graphical user interfaces for your Ethereum smart contracts." />
                <meta property="og:title" content="Ethereum smart contract interaction tool" />
                <meta property="og:description" content="Eth smart contract interaction tool is a tool that lets you interact with graphical user interfaces for your Ethereum smart contracts." />
                <meta property="og:url" content={`${BASE_URL}${location.pathname}`} />
                <link rel="canonical" href={`${BASE_URL}${location.pathname}`} />
            </Helmet>
            <div className="row">
                <div className="col-3">
                    <div className="row">
                        <div className="col-12">
                            <Fieldset legend="Network">
                                <section>
                                    <div className="mt-2">network: {networkName}</div>
                                    <div>chain ID: {networkId}</div>
                                    <div>wallet Address : {walletAddress ? truncateString(walletAddress) : "---"}</div>
                                </section>
                                <section>
                                    <label>
                                        RPC provider url{" "}
                                        <small>
                                            note: you can use "<code>{`{network}`}</code>" to replace network name
                                        </small>
                                    </label>
                                    <TextInput value={rpcProviderUrl} onChange={handleRpcProviderUrlChange} />
                                </section>
                            </Fieldset>
                        </div>
                        <div className="col-12">
                            <Fieldset legend="ABI">
                                <section>
                                    <input className="mb-2 w-100" value={abiSearch} onChange={(e) => setAbiSearch(e.target.value)} placeholder="&#128269; Search.."></input>
                                    <div style={{ height: "300px", overflow: "auto" }}>
                                        {abiMethodFormShown ? (
                                            <Modal show={abiMethodFormShown} onHide={() => handleCancelAbiClick()}>
                                                <Modal.Header closeButton>
                                                    <Modal.Title>Add ABI</Modal.Title>
                                                </Modal.Header>
                                                <Modal.Body>
                                                    {" "}
                                                    <TextInput value={newAbiName} onChange={handleNewAbiNameChange} placeholder={"ABI name"} />
                                                    <div className="mt-2">
                                                        <TextInput
                                                            value={customAbi}
                                                            onChange={handleAbiContent}
                                                            variant="textarea"
                                                            placeholder={`
 Examples

 function safeMint(address to, uint256 tokenId)
 function ownerOf(uint256 tokenId) public returns (address)

 or JSON ABI

 [
   {
     "type": "function",
     "name": "safeMint",
     "constant": false,
     "inputs": [{ "name": "to", "type": "address" }, { "name": "tokenId", "type": "uint256" }],
     "outputs": [],
     "payable": false,
     "stateMutability": "nonpayable"
   },
   {
     "type": "function",
     "name": "ownerOf",
     "constant": false,
     "inputs": [{ "name": "tokenId", "type": "uint256" }],
     "outputs": [{ "name": null, "type": "address", "baseType": "address" }],
     "payable": false,
     "stateMutability": "nonpayable"
   }
      ]
  `.trim()}
                                                        />
                                                    </div>
                                                    <div className="d-flex">
                                                        <button className="w-200 my-1 mx-2" onClick={handleSaveAbiClick}>
                                                            Save
                                                        </button>
                                                        <button className="w-200 my-1 mx-2" onClick={handleCancelAbiClick}>
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </Modal.Body>
                                            </Modal>
                                        ) : (
                                            <></>
                                        )}
                                        <div style={{ marginBottom: "1rem" }}>
                                            {abiOptions
                                                .filter((item) => {
                                                    return JSON.stringify(item).toLowerCase().indexOf(abiSearch.toLowerCase()) !== -1;
                                                })
                                                .map((item, i) => {
                                                    return (
                                                        <div className={`hover-div cursor-poiner ${abiSelectedLabel === item ? "selected" : ""}`} key={i} onClick={() => handleSelectChange(item)}>
                                                            {item}
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                    <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                                        <button className="w-100 my-1" onClick={handleAddAbiClick}>
                                            Add
                                        </button>
                                    </div>
                                    {!(nativeAbis as any)[selectedAbi] ? (
                                        <button className="w-200 my-1" onClick={handleDeleteAbiClick}>
                                            Delete
                                        </button>
                                    ) : null}
                                </section>
                            </Fieldset>
                        </div>
                    </div>
                </div>
                <div className="col-9">
                    <div className="row">
                        <div className="col-4">
                            <Fieldset legend="Contract">
                                <div>
                                    <label>Contract address</label>
                                    <TextInput value={contractAddress} onChange={handleContractAddressChange} placeholder="0x" />
                                </div>
                            </Fieldset>
                        </div>
                        <div className="col-8">
                            <Fieldset legend="Transaction hash">
                                <div>
                                    <label>Transaction hash</label>
                                    <TextInput value={txResult !== "" ? txResult.hash : ""} readOnly={true} />
                                </div>
                            </Fieldset>
                        </div>
                        <div className="col-12">
                            <div className="row">
                                <div className="col-4">
                                    <Fieldset legend="Method">{!abiMethodFormShown && <div>{renderMethodSelect()}</div>}</Fieldset>
                                </div>
                                <div className="col-8">
                                    <Fieldset legend="Method">{!abiMethodFormShown ? <div>{renderMethodForm()}</div> : null}</Fieldset>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Home;
