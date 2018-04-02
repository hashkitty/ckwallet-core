SELECT k.ID FROM Kitties AS k 
JOIN Traits AS t ON t.Name="crazy"
WHERE CAST(HEX(SUBSTR(k.Genes, t.TraitTypeID * 4 + 1, 1)) AS INT)=t.ID
