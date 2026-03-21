package com.devforge.orthoflow.Domain.entity.patient.history;

import com.devforge.orthoflow.Domain.entity.patient.history.enums.*;
import jakarta.persistence.*;
import lombok.Data;

import java.util.List;

@Entity
@Data
public class SoftTissueAnalysis {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private LipCompetency lipCompetency;

    @Enumerated(EnumType.STRING)
    private LipLine lipLine;

    @Enumerated(EnumType.STRING)
    private LipContour lipContour;

    @Enumerated(EnumType.STRING)
    private TongueSize tongueSize;

    @Enumerated(EnumType.STRING)
    private TongueThrust tongueThrust;

    //think
    @ElementCollection
    private List<String> mandibularPath;


}
