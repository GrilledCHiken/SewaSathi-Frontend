package com.sewasathi.dto.report;

import com.sewasathi.entity.PaymentProvider;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.Locale;

/**
 * One row of the revenue report: a month's completed payments through one gateway.
 *
 * <p>A JavaBean with public getters because that is what JasperReports'
 * {@code JRBeanCollectionDataSource} reflects over - a field named {@code grossAmount} is
 * reachable from the template as {@code $F{grossAmount}}.
 */
@Getter
@AllArgsConstructor
public class RevenueReportRow {

    private final Integer year;
    private final Integer month;
    private final PaymentProvider provider;
    private final Long transactionCount;
    /** Advance actually collected from the customer. */
    private final BigDecimal collectedAmount;
    /** Full value of the tasks those advances booked. */
    private final BigDecimal taskValue;

    /** "January 2026" - derived here so the .jrxml holds no date-formatting logic. */
    public String getPeriod() {
        return Month.of(month).getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + year;
    }

    public String getProviderName() {
        return provider != null ? provider.name() : "";
    }
}
