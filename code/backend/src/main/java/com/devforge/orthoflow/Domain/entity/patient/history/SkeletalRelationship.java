package com.devforge.orthoflow.Domain.entity.patient.history;

import com.devforge.orthoflow.Domain.entity.patient.history.enums.SeverityLevel;
import com.devforge.orthoflow.Domain.entity.patient.history.enums.SkeletalClass;
import com.devforge.orthoflow.Domain.entity.patient.history.enums.TransverseDiscrepancy;
import com.devforge.orthoflow.Domain.entity.patient.history.enums.VerticalPattern;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class SkeletalRelationship {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private SkeletalClass skeletalClass;

    @Enumerated(EnumType.STRING)
    private SeverityLevel severity;

    @Enumerated(EnumType.STRING)
    private VerticalPattern verticalPattern;

    @Enumerated(EnumType.STRING)
    private TransverseDiscrepancy transverseDiscrepancy;
}
