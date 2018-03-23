function tableField(name, nullable) {
    return {
        Name: name,
        Nullable: nullable
    }
}

exports.AuctionTypes = {
    Sales: 1,
    Sire: 2
};

exports.Tables = {
    Kitties: {
        Name: "Kitties",
        Fields: {
            ID: tableField("ID", false),
            Genes: tableField("Genes", false),
            Generation: tableField("Generation", false),
            MatronId: tableField("MatronId", false),
            PatronId: tableField("PatronId", false),
            BirthBlock: tableField("BirthBlock", false),
            Breeder: tableField("Breeder", false),
            Owner: tableField("Owner", false),
            ChildrenCount: tableField("ChildrenCount", true),
            NextActionAt: tableField("NextActionAt", true)
        }
    },
    Owners: {
        Name: "Owners",
        Fields: {
            ID: tableField("ID", false),
            Address: tableField("Address", false)
        }
    },
    Auctions: {
        Name: "Auctions",
        Fields: {
            ID: tableField("ID", false),
            KittyId: tableField("KittyId", false),
            Seller: tableField("Seller", false),
            StartedBlock: tableField("StartedBlock", false),
            Type: tableField("Type", false),
            Status: tableField("Status", false),
            EndedBlock: tableField("EndedBlock", false),
            StartPrice: tableField("StartPrice", false),
            EndPrice: tableField("EndPrice", false),
            BuyPrice: tableField("BuyPrice", false),
            Duration: tableField("Duration", false),
            Buyer: tableField("Buyer", false),
            BuyBlock: tableField("BuyBlock", false)
        }
    } ,
    ImportHistory: {
        Name: "ImportHistory",
        Fields: {
            EventName: tableField("EventName", false),
            BlockNumber: tableField("BlockNumber", false)
        }
    },
    Cooldowns: {
        Name: "Cooldowns",
        Fields: {
            ID: tableField("ID", false),
            CooldownBlocks: tableField("CooldownBlocks", false)
        }
    },
    PregnantEvents: {
        Name: "PregnantEvents",
        Fields: {
            MatronId: tableField("MatronId", false),
            PatronId: tableField("PatronId", false),
            NextActionAt: tableField("NextActionAt", false),
            BlockNumber: tableField("BlockNumber", false)
        }
    },
    Transfers: {
        Name: "Transfer",
        Fields: {
            ID: tableField("ID", false),
            From: tableField("From", false),
            To: tableField("To", false),
            BlockNumber: tableField("BlockNumber", false)
        }
    }
};

function getFieldsOfTable(table) {
    let res = [];
    let fields = table["Fields"];
    if(fields) {
        for(let key in fields) {
            res.push(fields[key]);
        }
    }
    return res;
}
exports.getFieldsOfTable = getFieldsOfTable;
