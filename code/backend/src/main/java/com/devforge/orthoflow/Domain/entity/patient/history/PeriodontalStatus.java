package com.devforge.orthoflow.Domain.entity.patient.history;

import com.devforge.orthoflow.Domain.entity.patient.history.enums.Airway;
import com.devforge.orthoflow.Domain.entity.patient.history.enums.FacialAsymmetry;
import com.devforge.orthoflow.Domain.entity.patient.history.enums.FacialProfile;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class PeriodontalStatus {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Boolean plaque;
    private Boolean calculus;
    private Boolean periodontalDisease;
    private Boolean satisfactory;

    private String teethPresent;
    private String caries;
    private String habits;

    @Enumerated(EnumType.STRING)
    private FacialProfile facialProfile;

    @Enumerated(EnumType.STRING)
    private FacialAsymmetry facialAsymmetry;

    @Enumerated(EnumType.STRING)
    private Airway airway;


}
