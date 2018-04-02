let assert = require("assert");
let {Tables} = require("./database-schema");

function QueryType(name, prefixes) {
    this.name = name;
    this.prefixes = prefixes;
}
function Keyword(name, sql) {
    this.name = name;
    this.sql = sql;
}

function QueryParser(database) {
    const userInputValidator = /^[a-zA-Z0-9:\s]+$/;
    const userStatementSeparator = ' ';
    const userStatementPrefixSeparator = ':';
    const allowedSqlOperator = ['and', 'or'];
    
    const Keywords = [
        new Keyword('virgin', `${Tables.Kitties.Fields.ChildrenCount.Name}=0`)
    ];

    const QueryTypes = Object.freeze({
        Trait: new QueryType("trait", ["d", "r1", "r2", "r3"]),
        Generation:  new QueryType("generation", ["gen"])
    });

    let traitMap;

    async function initialize() {
        if(!traitMap && database) {
            let traits = await database.getTraits();
            traitMap = {};
            for(let i = 0; i < traits.length; i++) {
                let trait = traits[i];
                assert(!traitMap[trait.Name]);
                traitMap[trait.Name] = trait;
            }
        }
    }

    function validateInput(input) {
        return userInputValidator.test(input);
    }

    function isSqlOperator(value) {
        return value && (allowedSqlOperator.indexOf(value.toLowerCase()) != -1);
    }

    function getKeyword(value) {
        return value && Keywords.find(v => v.name.toLowerCase() === value);
    }

    function parsePrefixedWord(value) {
        let res = {
            word: value 
        };
        if(value) {
            let split = value.split(':').filter(v => v);
            if(split.length == 2) {
                res.prefix = split[0];
                res.word = split[1];
            }
        }
        return res;
    }

    function getQueryType(prefix, word) {
        let res;
        if(prefix) {
            res = Object.values(QueryTypes).find(t => t.prefixes.find(p => p == prefix));
        }
        else {
            res = QueryTypes.Trait;//trait is default search type
        }
        return res;
    }

    function getTraitQuery(prefix, word) {
        if(!/^[a-zA-Z]+$/.test(word)) {
            throw new Error(`Invalid trait query: ${word}`);
        }
        if(!traitMap || !traitMap[word]) {
            throw new Error(`Invalid trait name: ${word}`);
        }

        let trait = traitMap[word];
        let geneColumns = [
            Tables.Kitties.Fields.GenesBody,
            Tables.Kitties.Fields.GenesPattern,
            Tables.Kitties.Fields.GenesEyeColor,
            Tables.Kitties.Fields.GenesEyeType,
            Tables.Kitties.Fields.GenesBodyColor,
            Tables.Kitties.Fields.GenesPatternColor,
            Tables.Kitties.Fields.GenesAccentColor,
            Tables.Kitties.Fields.GenesWild,
            Tables.Kitties.Fields.GenesMouth,
            Tables.Kitties.Fields.GenesUnknown1,
            Tables.Kitties.Fields.GenesUnknown2,
            Tables.Kitties.Fields.GenesUnknown3
        ];
        let traitOffset = QueryTypes.Trait.prefixes.indexOf(prefix);
        assert(traitOffset >= 0, `Invalid prefix ${prefix}`);
        let traitMask = 0xff << (traitOffset * 8);
        let column = geneColumns[trait.TraitTypeID].Name;
        return `${column} & ${traitMask} = ${trait.ID}`;
    }

    function getGenerationQuery(prefix, word) {
        if(!/^[0-9]+$/.test(word)) {
            throw new Error(`Invalid generation query: ${word}`);
        }
        return `${Tables.Kitties.Fields.Generation.Name}=${word}`;
    }

    function translateWord(word) {
        let res;
        let keyword;
        if(!word) {
            throw new Error(`Invalid statement ${word}`);
        }
        if(isSqlOperator(word)) {
            res = word;
        }
        else if(keyword = getKeyword(word)) {
            res = keyword.sql;
        }
        else {
            let prefixedWord = parsePrefixedWord(word);
            let type = getQueryType(prefixedWord.prefix, prefixedWord.word);
            if(!type) {
                throw new Error(`Unknown query ${word}`);
            }
            prefixedWord.prefix = prefixedWord.prefix || type.prefixes[0];//assign default prefix if omitted
            switch(type) {
                case QueryTypes.Trait:
                    res = getTraitQuery(prefixedWord.prefix, prefixedWord.word);
                break;
                case QueryTypes.Generation:
                    res = getGenerationQuery(prefixedWord.prefix, prefixedWord.word);
                break
                default:
                    throw new Error(`Unknown query ${word}`);
                break;
            }
        }
        return res;
    }

    function translateUserInput(input) {
        let res = null;

        if(!input || !validateInput(input)) {
            throw new Error(`Invalid input ${input || "null"}`);
        }
        let statements = [];
        let words = input.split(userStatementSeparator).filter(v => v);
        let operator;
        for(let i = 0; i < words.length; i++) {
            let word = words[i];
            let statement = translateWord(word);
            if(!statement) {
               throw new Error(`Invalid statement ${word}`);
            }
            if(!res && isSqlOperator(statement)) {
                throw new Error(`Cannot start clause with operation`);
            }
            if(!res) {
                res = statement;
            }
            else {
                
                if(isSqlOperator(statement)) {
                    operator = statement; //save operator to use with next statement
                }
                else {
                    if(operator) {
                        res += ` ${operator}`;
                        operator = null; //clear used operator
                    }
                    else {
                        res += ` AND`; //use AND as default operator
                    }
                    res += ` ${statement}`; //append next statement
                }
            }
        }
        return res;
    }

    this.translateUserInput = translateUserInput;
    this.initialize = initialize;
}

module.exports = QueryParser;