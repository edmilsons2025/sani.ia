// Gera um ID de lote baseado na data e em um sequencial
export const generateNewLoteId = (allTests: any[]): string => {
    const today = new Date();
    const datePrefix = `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth() + 1).padStart(2, '0')}${today.getFullYear()}`;
    const lotesToday = new Set(allTests.map(t => t.equipamento.lote_id).filter(id => id && id.startsWith(datePrefix)));
    return `${datePrefix}-${String(lotesToday.size + 1).padStart(3, '0')}`;
};

// Exporta dados filtrados para um arquivo CSV
export const exportToCsv = (dataToExport: any[]) => {
    if (dataToExport.length === 0) {
        alert('Não há dados para exportar.');
        return;
    }

    const masterHeaders = new Set<string>();
    dataToExport.forEach(test => Object.values(test.testes).forEach((item: any) => masterHeaders.add(item.name)));
    
    let csvContent = "data:text/csv;charset=utf-8,";
    const baseHeaders = ["Data", "Lote", "Tipo", "SKU", "Barebone", "S/N"];
    const testHeaders = [...masterHeaders].sort();
    csvContent += [...baseHeaders, ...testHeaders.map(h => `Status ${h}`), ...testHeaders.map(h => `Obs ${h}`), "Obs Gerais"].join(",") + "\r\n";

    dataToExport.forEach(test => {
        let row = [
            new Date(test.timestamp).toLocaleString('pt-BR'), `"${test.equipamento.lote_id}"`,
            `"${test.equipamento.tipo_equipamento}"`, `"${test.equipamento.sku}"`,
            `"${test.equipamento.barebone}"`, `"${test.equipamento.numero_serie}"`
        ];
        const testMap = new Map(Object.values(test.testes).map((t: any) => [t.name, t]));
        row.push(...testHeaders.map(h => `"${testMap.get(h)?.status || ''}"`));
        row.push(...testHeaders.map(h => `"${(testMap.get(h)?.observacao || '').replace(/"/g, '""')}"`));
        row.push(`"${(test.observacoes_gerais || '').replace(/"/g, '""')}"`);
        csvContent += row.join(",") + "\r\n";
    });

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "relatorio_testes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
