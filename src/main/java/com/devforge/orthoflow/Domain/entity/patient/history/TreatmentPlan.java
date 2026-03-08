package com.devforge.orthoflow.Domain.entity.patient.history;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

import java.time.LocalDate;

@Entity
@Data
public class TreatmentPlan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Boolean suitableForConsultation;
    private String treatmentCategory;
    private String prognosis;
    private String priority;
    private String consultantSignature;
    private LocalDate planDate;
}
