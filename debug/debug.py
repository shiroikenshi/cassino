import pandas as pd

def verificar_vitorias_no_excel(nome_arquivo_excel):
    # Ler a planilha "Estatísticas" do arquivo Excel
    df = pd.read_excel(nome_arquivo_excel, sheet_name='Estatísticas')

    # Filtrar as colunas necessárias
    rodadas = df['Rodada']
    cor_apostada = df['Cor Apostada']
    cor_final = df['Cor Final']

    # Criar uma lista para armazenar se foi "Ganhou" ou "Perdeu" com base na cor
    lista_resultados = []

    for index, row in df.iterrows():
        if row['Cor Apostada'] == row['Cor Final']:
            lista_resultados.append('Ganhou')
        else:
            lista_resultados.append('Perdeu')

    # Remover as 5 primeiras rodadas da lista
    lista_resultados_pos5 = lista_resultados[5:]

    # Dividir as rodadas em lotes de 5
    lotes = [lista_resultados_pos5[i:i + 5] for i in range(0, len(lista_resultados_pos5), 5)]

    # Verificar cada lote
    inconsistencias_encontradas = False
    for indice_lote, lote in enumerate(lotes, start=2):  # Começa do lote 2 considerando que o primeiro foi ignorado
        vitorias_no_lote = lote.count('Ganhou')
        if vitorias_no_lote > 1:
            inconsistencias_encontradas = True
            inicio_rodada = 5 + (indice_lote - 1) * 5 + 1
            fim_rodada = inicio_rodada + 4
            print(f"Lote {indice_lote} (Rodadas {inicio_rodada}-{fim_rodada}) possui {vitorias_no_lote} vitórias.")
            print(f"Resultados: {lote}")

    if not inconsistencias_encontradas:
        print("Nenhuma inconsistência encontrada. Todos os lotes após as 5 primeiras rodadas possuem no máximo 1 vitória.")

# Exemplo de uso:
# Substitua 'seu_arquivo.xlsx' pelo nome do arquivo Excel gerado pelo jogo
verificar_vitorias_no_excel('debug/teste.xlsx')