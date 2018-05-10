
--Auction Statutes
CREATE TABLE "AuctionStatuses" (
    "ID" [tinyint] NOT NULL, 
    "Title" [nvarchar] (50) NOT NULL,
    PRIMARY KEY("ID")
);
--Initial auction statuses
INSERT INTO AuctionStatuses (ID, TITLE) VALUES(1, "In progress"), (2, "Completed"), (3, "Cancelled");

--Auction Types
CREATE TABLE "AuctionTypes" (
    "ID" [tinyint] NOT NULL,
    "Title" [nvarchar] (50),
    PRIMARY KEY("ID")
);
--Initial auction types
INSERT INTO AuctionTypes (ID, TITLE) VALUES(1, "Sale"), (2, "Sire");

--Auctions
CREATE TABLE "Auctions" (
    "ID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "KittyId" [int] NOT NULL,
    "Type" [tinyint] NOT NULL,
    "Status" [tinyint] NOT NULL,
    "Duration" [bigint] NOT NULL,
    "StartPrice" [float] NOT NULL,
    "EndPrice" [float] NOT NULL,
    "StartedBlock" [bigint] NOT NULL,
    "EndedBlock" [bigint] NULL,
    "BuyPrice" [float] NULL,
    "Buyer" [int] NULL,
    FOREIGN KEY("Type") REFERENCES AuctionTypes("ID"),
    FOREIGN KEY("Status") REFERENCES AuctionStatuses("ID"),
    FOREIGN KEY("KittyId") REFERENCES Kitties("ID"),
    FOREIGN KEY("Buyer") REFERENCES Owners("ID")
);

--Owners
CREATE TABLE "Owners" (
    "ID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "Address" [binary] (20) NOT NULL UNIQUE
);
--Owner of kitty 0
INSERT INTO Owners("Address") VALUES ('0x00000000000000000000');

--Kitties
CREATE TABLE "Kitties" ( 
    "ID" [int] NOT NULL,
    "GenesBody" [int] NOT NULL,
    "GenesPattern" [int] NOT NULL,
    "GenesEyeColor" [int] NOT NULL,
    "GenesEyeType" [int] NOT NULL,
    "GenesBodyColor" [int] NOT NULL,
    "GenesPatternColor" [int] NOT NULL,
    "GenesAccentColor" [int] NOT NULL,
    "GenesWild" [int] NOT NULL,
    "GenesMouth" [int] NOT NULL,
    "GenesUnknown1" [int] NOT NULL,
    "GenesUnknown2" [int] NOT NULL,
    "GenesUnknown3" [int] NOT NULL,
    "Generation" [int] NOT NULL,
    "MatronId" [int] NOT NULL,
    "PatronId" [int] NOT NULL,
    "BirthBlock" [bigint] NOT NULL,
    "Breeder" [int] NOT NULL,
    "Owner" [int] NOT NULL,
    "ChildrenCount" [int] NOT NULL,
    "NextActionAt" [bigint],
    PRIMARY KEY("ID"),
    FOREIGN KEY("Owner") REFERENCES Owners("ID"),
    FOREIGN KEY("Breeder") REFERENCES Owners("ID"),
    FOREIGN KEY("MatronId") REFERENCES Kitties("ID"),
    FOREIGN KEY("PatronId") REFERENCES Kitties("ID")
);

--Kitty 0
INSERT INTO Kitties("ID",
    "GenesBody",
    "GenesPattern",
    "GenesEyeColor",
    "GenesEyeType",
    "GenesBodyColor",
    "GenesPatternColor",
    "GenesAccentColor",
    "GenesWild",
    "GenesMouth",
    "GenesUnknown1",
    "GenesUnknown2",
    "GenesUnknown3",
    "Generation",
    "MatronId",
    "PatronId",
    "BirthBlock",
    "Breeder",
    "Owner",
    "ChildrenCount",
    "NextActionAt")
VALUES(0, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0, 0, 0, 4605167, 1, 1, 0, NULL);

--Update children count trigger and kitty generation
CREATE TRIGGER KittiesAfterInsert
AFTER INSERT
ON Kitties
BEGIN
    --Update children cnt for parents if parents already inserted
    UPDATE Kitties
    SET ChildrenCount = ChildrenCount + 1
    WHERE ID = NEW.MatronId OR ID = NEW.PatronId AND NEW.MatronId <> 0;
END;

--Import History
CREATE TABLE "ImportHistory" (
    "EventName" [nchar] (10) NOT NULL,
    "BlockNumber" [bigint] NOT NULL
);
INSERT INTO ImportHistory(EventName, BlockNumber)
VALUES("Pregnant", 0), ("Transfer", 0), ("SaleAuctionCancelled", 0), ("SaleAuctionSuccessful", 0), ("SireAuctionCancelled", 0), ("SireAuctionSuccessful", 0);

--Cooldowns
CREATE Table "Cooldowns" (
    "ID" [tinyint] NOT NULL,
    "CooldownBlocks" INTEGER NOT NULL
);

INSERT INTO Cooldowns("ID", CooldownBlocks) 
VALUES(0, 4), 
(1, 8), 
(2, 20), 
(3, 40), 
(4, 120), 
(5, 240),
(6, 480),
(7, 960),
(8, 1920),
(9, 3840),
(10, 5760),
(11, 11520),
(12, 23040),
(13, 40320);

--Traits
CREATE TABLE Traits (
    "ID" [tinyint] NOT NULL,
    "TraitTypeID" [tinyint] NOT NULL,
    "Name" nvarchar(250) NOT NULL UNIQUE,
    "DominantGen0" bit 
);

CREATE TABLE TraitTypes (
    "ID" [tinyint] NOT NULL,
    "Name" nvarchar(250) NOT NULL UNIQUE
);

--Trait types
INSERT INTO TraitTypes("ID", "Name") 
VALUES 
(0, "Body"),
(1, "Pattern"),
(2, "Eye Color"),
(3, "Eye Type"),
(4, "Body Color"),
(5, "Pattern Color"),
(6, "Accent Color"),
(7, "Wild"),
(8, "Mouth"),
(9, "Environment"),
(10, "Unknown2"),
(11, "Unknown3");

CREATE VIEW ActiveAuctions AS
SELECT * FROM Auctions WHERE Status=1;

CREATE INDEX IND_KittyID ON Kitties (ID);
CREATE INDEX IND_AuctionID ON Auctions (ID);
CREATE INDEX IND_AuctionKittyIDStatus ON Auctions (KittyID, Status);
CREATE INDEX IND_OwnerID ON Owners (ID);
CREATE INDEX IND_OwnerAddress ON Owners (Address);

