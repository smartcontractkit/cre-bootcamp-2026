// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IReceiverTemplate
/// @notice Interface for contracts that receive reports from CRE workflows.
/// @dev Implement this interface to allow your contract to receive signed reports from CRE.
abstract contract IReceiverTemplate {
    /// @notice Called by CRE to deliver a signed report.
    /// @param metadata Metadata about the report.
    /// @param report The ABI-encoded report data.
    function onReport(bytes calldata metadata, bytes calldata report) external virtual;

    /// @notice Internal function to process the report data.
    /// @dev Override this in your contract to handle the decoded report.
    /// @param report The ABI-encoded report data.
    function _processReport(bytes calldata report) internal virtual;

    constructor(address, bytes10) {}
}
