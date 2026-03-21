package com.devforge.orthoflow.External.repository;

import com.devforge.orthoflow.Domain.entity.patient.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PatientRepository extends JpaRepository <Patient, Integer> {
}
