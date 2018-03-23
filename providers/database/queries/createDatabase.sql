
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
INSERT INTO Owners("Address") VALUES (0);

--Kitties
CREATE TABLE "Kitties" ( 
    "ID" [int] NOT NULL,
    "Genes" [binary] (32) NOT NULL,
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
INSERT INTO Kitties("ID", "Genes", "Generation", "MatronId", "PatronId", "BirthBlock", "Breeder", "Owner", "ChildrenCount", "NextActionAt")
VALUES(0, -1, 0, 0, 0, 4605167, 1, 1, 0, NULL);

--Update children count trigger and kitty generation
CREATE TRIGGER KittiesAfterInsert
AFTER INSERT
ON Kitties
BEGIN
    --Update children cnt for parents if parents already inserted
    UPDATE Kitties
    SET ChildrenCount = ChildrenCount + 1
    WHERE ID = NEW.MatronId OR ID = NEW.PatronId AND NEW.MatronId <> 0;

    --Update generation for child
    UPDATE Kitties
    SET Generation = (SELECT MAX(Generation) + 1 FROM Kitties WHERE ID = NEW.MatronId OR ID = NEW.PatronId)
    WHERE ID = NEW.ID;
END;

--Import History
CREATE TABLE "ImportHistory" (
    "EventName" [nchar] (10) NOT NULL,
    "BlockNumber" [bigint] NOT NULL
);
INSERT INTO ImportHistory(EventName, BlockNumber)
VALUES("Pregnant", 0), ("Transfer", 0);

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

