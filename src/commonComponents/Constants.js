export const TAB_LIST = [
    { name: "Network", nav: "/", id: "1" },
    { name: "Contract", nav: "/", id: "2" },
    { name: "transaction hash", nav: "/", id: "3" },
    { name: "ABI", nav: "/", id: "4" },
    { name: "Method", nav: "/", id: "5" },
    { name: "Method form", nav: "/", id: "6" },

    //decoder
    { name: "Decoder", nav: "/decoder", id: "7" },

    //decode raw tx
    { name: "Decode Raw Tx", nav: "/decode-raw-tx", id: "32" },
    //tools
    { name: "Method and Event Topic Signature Generator", nav: "/tools", id: "8" },
    { name: "4byte dictionary", nav: "/tools", id: "9" },
    { name: "Gas Cost Calculator", nav: "/tools", id: "10" },

    //transaction
    { name: "Send ETH", nav: "/transaction", id: "11" },
    { name: "Get nonce", nav: "/transaction", id: "12" },
    { name: "Custom transaction", nav: "/transaction", id: "13" },
    { name: "Send raw transaction", nav: "/transaction", id: "14" },
    { name: "Get Gas Price", nav: "/transaction", id: "" },
    { name: "Get Gas Fee Data", nav: "/transaction", id: "16" },
    { name: "Get Transaction", nav: "/transaction", id: "17" },
    { name: "Get Transaction Receipt", nav: "/transaction", id: "18" },

    //unit-convert
    { name: "Unit Convert", nav: "/unit-convert", id: "19" },

    //sign-verify
    { name: "Encrypt Message", nav: "/sign-verify", id: "20" },
    { name: "Decrypt Message", nav: "/sign-verify", id: "21" },
    { name: "Hash Message", nav: "/sign-verify", id: "22" },
    { name: "Sign Message", nav: "/sign-verify", id: "23" },
    { name: "Verify signature", nav: "/sign-verify", id: "24" },

    //addres
    { name: "Checksum Address", nav: "/address", id: "25" },
    { name: "Private Key to Address", nav: "/address", id: "26" },
    { name: "Private Key to Public Key", nav: "/address", id: "27" },
    { name: "Public Key to Address", nav: "/address", id: "28" },

    //utilities
    { name: "IPFS coder", nav: "/utilities", id: "29" },
    { name: "ContentHash coder", nav: "/utilities", id: "30" },
    { name: "IPNS ContentHash", nav: "/utilities", id: "31" },
];

export const NETWORK_OPTIONS = [
    {
        name: "injected",
        value: "injected",
    },
    {
        name: "mainnet",
        value: "mainnet",
    },
    {
        name: "goerli",
        value: "goerli",
    },
];
