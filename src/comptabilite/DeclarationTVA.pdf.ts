import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BuildPDFParams, DeclarationItem, TotalRow } from './DeclarationTVA.types';

export function buildDeclarationPDF({ entiteName, entiteSigle, entiteNif, entiteAdresse, moisName, exerciceAnnee, declaration }: BuildPDFParams): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW: number = doc.internal.pageSize.getWidth();
  const pageH: number = doc.internal.pageSize.getHeight();
  const marginL = 12;
  const marginR = 12;
  const contentW: number = pageW - marginL - marginR;

  // Helpers
  const L = (n: number): number => {
    const lignes: Record<string, number> = (declaration && declaration.lignes) || {};
    const val: number | undefined = lignes[String(n)];
    return val != null ? parseFloat(String(val)) || 0 : 0;
  };
  const fmt = (v: number | string): string => {
    const n = parseFloat(String(v)) || 0;
    return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  let y = 10;

  // ---- Page header ----
  const drawPageHeader = (): void => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text("MINISTÈRE DE L'ÉCONOMIE ET DES FINANCES", marginL, y);
    doc.text('RÉPUBLIQUE DU CONGO', pageW - marginR, y, { align: 'right' });
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('DIRECTION GÉNÉRALE DES IMPÔTS ET DES DOMAINES', marginL, y);
    doc.text('UNITÉ * TRAVAIL * PROGRÈS', pageW - marginR, y, { align: 'right' });
    y += 3;
    doc.setDrawColor(80);
    doc.setLineWidth(0.4);
    doc.line(marginL, y, pageW - marginR, y);
    y += 6;
  };

  // ---- Ensure space, add page if needed ----
  const ensureSpace = (needed: number): void => {
    if (y + needed > pageH - 14) {
      doc.addPage();
      y = 10;
      drawPageHeader();
    }
  };

  // ---- Section table helper ----
  const headStyles = { fillColor: [80, 80, 80] as [number, number, number], textColor: 255, fontStyle: 'bold' as const, fontSize: 8 };
  const bodyStyles = { fontSize: 7.5, cellPadding: 2 };

  const drawTable = (title: string | null, head: string[], body: TotalRow[]): void => {
    if (title) {
      ensureSpace(18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(title, marginL, y);
      y += 5;
    }
    autoTable(doc, {
      startY: y,
      margin: { left: marginL, right: marginR },
      head: [head],
      body: body,
      headStyles: headStyles,
      styles: bodyStyles,
      theme: 'grid',
      columnStyles: {
        0: { cellWidth: contentW - 30 - 40 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 40, halign: 'right' },
      },
      didParseCell: (data: { row: { raw: TotalRow | null }; cell: { styles: { fillColor: number[]; fontStyle: string } } }) => {
        if (data.row.raw && (data.row.raw as TotalRow)._total) {
          data.cell.styles.fillColor = [220, 220, 220];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      willDrawPage: () => {
        // In case auto-table adds a page
      },
    } as never);
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  };

  // Mark a row as total
  const T = (cells: string[]): TotalRow => { const r: TotalRow = [...cells]; r._total = true; return r; };

  // ---- Build document ----
  drawPageHeader();

  // Title block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const titleLines: string[] = doc.splitTextToSize(
    'ACCUSÉ DE RÉCEPTION DE LA DÉCLARATION GÉNÉRALE DES IMPÔTS ET TAXES',
    contentW
  );
  doc.text(titleLines, pageW / 2, y, { align: 'center' });
  y += titleLines.length * 5 + 2;
  doc.setFontSize(10);
  doc.text(`au titre ${moisName} ${exerciceAnnee}`, pageW / 2, y, { align: 'center' });
  y += 8;

  // Identification section
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setDrawColor(180);
  doc.rect(marginL, y, contentW, 28);
  const idY: number = y + 5;
  doc.text(`NIU : ${entiteNif || '________'}`, marginL + 4, idY);
  doc.text(`Sigle : ${entiteSigle || '________'}`, pageW / 2, idY);
  doc.text(`Nom ou dénomination sociale : ${entiteName || '________'}`, marginL + 4, idY + 6);
  doc.text(`Adresse : ${entiteAdresse || '________'}`, marginL + 4, idY + 12);
  doc.text('Résidence fiscale : ________', marginL + 4, idY + 18);
  doc.text('Téléphone : ________', pageW / 2 - 20, idY + 18);
  doc.text('Email : ________', pageW / 2 + 30, idY + 18);
  y += 34;

  // === I - TVA ===
  ensureSpace(12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('I - TAXE SUR LA VALEUR AJOUTÉE (TVA)', marginL, y);
  y += 6;

  // I-1 OPÉRATIONS RÉALISÉES
  const colHead: string[] = ['Opérations', 'N° ligne', 'Montant'];
  drawTable('I-1 OPÉRATIONS RÉALISÉES', colHead, [
    ['Opérations imposables au taux normal de 18%', '1', fmt(L(1))],
    ['Opérations réalisées avec les administrations publiques au taux de 18% (avec retenue à la source)', '2', fmt(L(2))],
    ['Livraisons à soi-même au taux normal de 18%', '3', fmt(L(3))],
    ['Opérations imposables au taux réduit de 5%', '4', fmt(L(4))],
    ['Opérations réalisées avec les administrations publiques au taux de 5% (avec retenue à la source)', '5', fmt(L(5))],
    ['Livraisons à soi-même au taux réduit de 5%', '6', fmt(L(6))],
    ['Exportations et transports internationaux au taux zéro', '7', fmt(L(7))],
    ['Autres opérations imposables au taux zéro', '8', fmt(L(8))],
    ['Opérations non imposables', '9', fmt(L(9))],
    T(['Total des opérations réalisées', '10', fmt(L(10))]),
  ]);

  // I-2 DÉDUCTIONS
  ensureSpace(12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('I-2 DÉDUCTIONS', marginL, y);
  y += 5;

  drawTable('a- Déductions à 100%', colHead, [
    ['À l\'importation', '11', fmt(L(11))],
    ['Achats locaux', '12', fmt(L(12))],
    ['Compléments de déductions', '13', fmt(L(13))],
    T(['Total TVA déductible à 100% (ligne 11 + ligne 12 + ligne 13)', '14', fmt(L(14))]),
  ]);

  drawTable('b- Déductions en application du prorata', colHead, []);
  drawTable('b.1- Biens et services', colHead, [
    ['À l\'importation', '15', fmt(L(15))],
    ['Achats locaux', '16', fmt(L(16))],
    ['Compléments de déductions', '17', fmt(L(17))],
    T(['Total biens et services', '18', fmt(L(18))]),
  ]);

  drawTable('b.2- Immobilisations', colHead, [
    ['À l\'importation', '19', fmt(L(19))],
    ['Achats locaux', '20', fmt(L(20))],
    ['Compléments de déductions', '21', fmt(L(21))],
    T(['Total immobilisations', '22', fmt(L(22))]),
    T(['Total prorata', '23', fmt(L(23))]),
    ['Prorata', '24', fmt(L(24))],
    ['Montant prorata', '25', fmt(L(25))],
  ]);

  drawTable('c- Autres déductions', colHead, [
    ['Complément de déductions sur régularisation du prorata', '26', fmt(L(26))],
    ['Report de crédit de TVA (ligne 45 de la déclaration du mois précédent)', '27', fmt(L(27))],
    T(['Total autres déductions', '28', fmt(L(28))]),
    T(['TOTAL TVA DÉDUCTIBLE', '29', fmt(L(29))]),
  ]);

  // I-3 DÉCOMPTE DES DROITS
  ensureSpace(12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('I-3 DÉCOMPTE DES DROITS', marginL, y);
  y += 5;

  drawTable('a) TVA collectée', colHead, [
    ['TVA brute au taux normal (ligne 1 + ligne 2 + ligne 3) x 18%', '30', fmt(L(30))],
    ['TVA brute au taux réduit (ligne 4 + ligne 5 + ligne 6) x 5%', '31', fmt(L(31))],
    T(['Total TVA brute de la période (ligne 30 + ligne 31)', '32', fmt(L(32))]),
    ['Reversement de la TVA collectée sur les opérations antérieures', '33', fmt(L(33))],
    T(['Total TVA collectée (ligne 32 + ligne 33)', '34', fmt(L(34))]),
    ['Reversement de la TVA sur les déductions annulées ou à régulariser', '35', fmt(L(35))],
    T(['Total TVA due (ligne 34 + ligne 35)', '36', fmt(L(36))]),
  ]);

  drawTable('b) TVA déductible', colHead, [
    ['TVA déductible (report de la ligne 29)', '37', fmt(L(37))],
    ['TVA retenue à la source (ligne 2 x 18%) + (ligne 5 x 5%)', '38', fmt(L(38))],
    ['TVA remboursée aux agents diplomatiques', '39', fmt(L(39))],
    ['TVA collectée sur les opérations annulées ou résiliées', '40', fmt(L(40))],
    T(['Total TVA à déduire (ligne 37 + ligne 38 + ligne 39 + ligne 40)', '41', fmt(L(41))]),
  ]);

  drawTable('c) TVA nette', colHead, [
    ['TVA nette à payer (ligne 36 – ligne 41)', '42', fmt(L(42))],
    ['Crédit de TVA (ligne 41 – ligne 36)', '43', fmt(L(43))],
    ['Crédit de TVA demandé en remboursement', '44', fmt(L(44))],
    ['Crédit de TVA à reporter (ligne 43 – ligne 44)', '45', fmt(L(45))],
  ]);

  // === II - DROITS D'ACCISES (DAC) ===
  drawTable('II - DROITS D\'ACCISES (DAC)', colHead, [
    ['Produits imposables à 12,5%', '47', fmt(L(47))],
    ['Produits imposables à 15%', '48', fmt(L(48))],
    ['Produits imposables à 16,5%', '49', fmt(L(49))],
    ['Produits imposables à 25%', '50', fmt(L(50))],
    T(['Total DAC', '51', fmt(L(51))]),
  ]);

  // === III - TSJHA ===
  drawTable('III - TSJHA', colHead, [
    ['Taxe spéciale sur les jeux de hasard et assimilés', '52', fmt(L(52))],
  ]);

  // === IV - TTF ===
  drawTable('IV - TTF', colHead, [
    ['Transferts nationaux', '53', fmt(L(53))],
    ['Transferts internationaux sortants', '54', fmt(L(54))],
    ['Transferts internationaux entrants', '55', fmt(L(55))],
    ['Rechargements téléphoniques', '56', fmt(L(56))],
    T(['Total TTF', '57', fmt(L(57))]),
  ]);

  // === V - TART ===
  drawTable('V - TART', colHead, [
    ['Taxe additionnelle sur les revenus des télécommunications', '58', fmt(L(58))],
  ]);

  // === VI - TTCE ===
  drawTable('VI - TTCE', colHead, [
    ['Tabac', '59', fmt(L(59))],
    ['Boissons alcoolisées', '60', fmt(L(60))],
    ['Boissons non alcoolisées', '61', fmt(L(61))],
    ['Cosmétiques', '62', fmt(L(62))],
    T(['Total TTCE', '63', fmt(L(63))]),
  ]);

  // === VII - RAV ===
  drawTable('VII - RAV', colHead, [
    ['Redevance audiovisuelle – personnes physiques', '64', fmt(L(64))],
    ['Redevance audiovisuelle – personnes morales', '65', fmt(L(65))],
    T(['Total RAV', '66', fmt(L(66))]),
  ]);

  // === VIII - IRPP BICA-BNC-BA (IBA CGI 2026) ===
  drawTable('VIII - IRPP BICA-BNC-BA (IBA CGI 2026)', colHead, [
    ['Acompte IRPP / BICA', '67', fmt(L(67))],
    ['Acompte IRPP / BNC', '68', fmt(L(68))],
    ['Acompte IRPP / BA', '69', fmt(L(69))],
    ['Retenue à la source IRPP / BICA-BNC', '70', fmt(L(70))],
    T(['Total IRPP BICA-BNC-BA', '71', fmt(L(71))]),
  ]);

  // === IX - IRPP/TS (ITS CGI 2026) ===
  drawTable('IX - IRPP/TS (ITS CGI 2026)', colHead, [
    ['Impôt sur les traitements et salaires', '72', fmt(L(72))],
    T(['Total ITS', '73', fmt(L(73))]),
  ]);

  // === X - IS (Minimum de perception CGI 2026) ===
  drawTable('X - IS (Minimum de perception CGI 2026)', colHead, [
    ['Acompte IS (Minimum de perception)', '74', fmt(L(74))],
    ['Retenue à la source IS', '75', fmt(L(75))],
    T(['Total IS', '76', fmt(L(76))]),
  ]);

  // === XIII - TUS ===
  drawTable('XIII - TUS', colHead, [
    ['Taxe unique sur les salaires – taux normal', '101', fmt(L(101))],
    ['Taxe unique sur les salaires – taux réduit', '102', fmt(L(102))],
    ['Taxe d\'apprentissage', '103', fmt(L(103))],
    ['Contribution à la formation professionnelle', '104', fmt(L(104))],
    T(['Total TUS', '105', fmt(L(105))]),
  ]);

  // === XIV - TST ===
  drawTable('XIV - TST', colHead, [
    ['Taxe sur les sociétés de télécommunication – voix', '107', fmt(L(107))],
    ['Taxe sur les sociétés de télécommunication – SMS', '108', fmt(L(108))],
    ['Taxe sur les sociétés de télécommunication – data', '109', fmt(L(109))],
    ['Taxe sur les sociétés de télécommunication – mobile money', '110', fmt(L(110))],
    ['Taxe sur les sociétés de télécommunication – roaming', '111', fmt(L(111))],
    ['Taxe sur les sociétés de télécommunication – interconnexion', '112', fmt(L(112))],
    ['Taxe sur les sociétés de télécommunication – USSD', '113', fmt(L(113))],
    ['Taxe sur les sociétés de télécommunication – internet fixe', '114', fmt(L(114))],
    ['Taxe sur les sociétés de télécommunication – autres', '115', fmt(L(115))],
    ['Pénalités', '116', fmt(L(116))],
    ['Intérêts de retard', '117', fmt(L(117))],
    T(['Total TST', '118', fmt(L(118))]),
  ]);

  // === XXII - CAD ===
  drawTable('XXII - CAD', colHead, [
    ['Centimes additionnels – patente', '158', fmt(L(158))],
    ['Centimes additionnels – foncier bâti', '159', fmt(L(159))],
    ['Centimes additionnels – foncier non bâti', '160', fmt(L(160))],
    ['Centimes additionnels – contribution mobilière', '161', fmt(L(161))],
    ['Centimes additionnels – taxe d\'habitation', '162', fmt(L(162))],
    ['Centimes additionnels – taxe de balayage', '163', fmt(L(163))],
    ['Centimes additionnels – taxe sur la publicité', '164', fmt(L(164))],
    ['Centimes additionnels – taxe sur les spectacles', '165', fmt(L(165))],
    ['Pénalités', '166', fmt(L(166))],
    T(['Total CAD', '167', fmt(L(167))]),
  ]);

  // === XXIII - TOL ===
  drawTable('XXIII - TOL', colHead, [
    ['Taxe sur l\'occupation des locaux', '168', fmt(L(168))],
    ['Pénalités', '169', fmt(L(169))],
    T(['Total TOL', '170', fmt(L(170))]),
  ]);

  return doc;
}
